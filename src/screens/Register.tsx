import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import type { Hash } from 'viem'
import { sendTransaction } from 'wagmi/actions'
import { cx, style, variants } from 'zyzz'

import { Identity } from '../components/Identity'
import { Page } from '../components/Page'
import { TestnetFaucet } from '../components/TestnetFaucet'
import { WalletModal } from '../components/WalletModal'
import { Button, Card, Input, Notice, Row, Spinner } from '../components/ui'
import { useEnsClient } from '../hooks/useEnsClient'
import { useNameAvailability } from '../hooks/useNameAvailability'
import {
  type Phase,
  type RegistrationParams,
  type RegistrationState,
  useRegistration,
} from '../hooks/useRegistration'
import { useWalletOnNetwork } from '../hooks/useWalletOnNetwork'
import { explorerUrl, sepolia } from '../lib/chains'
import { formatAmount } from '../lib/format'
import { useNetwork } from '../lib/network'
import {
  PAYMENT_TOKENS,
  type PaymentToken,
  getErrorMessage,
  getSetPrimaryNameCall,
  parseLabel,
} from '../lib/registration'
import { confirmTransaction } from '../lib/transactions'
import { config } from '../lib/wagmi'

export function RegisterScreen() {
  const { chainId } = useNetwork()
  // Locked in once the user starts, so the saved commitment always matches
  const [params, setParams] = useState<RegistrationParams>()

  // Switching networks or accounts abandons the form (a saved commitment is
  // kept and picked up again if the same registration is restarted)
  const { address } = useWalletOnNetwork()
  useEffect(() => setParams(undefined), [chainId, address])

  return (
    <Page
      title="Register a name"
      description="Register a .eth name on ENSv2. Payment is in USDC or DAI, and the name points at a resolver you own, so it resolves to your address as soon as it's registered."
      source="src/lib/registration.ts"
    >
      {params ? (
        <RegistrationFlow params={params} onExit={() => setParams(undefined)} />
      ) : (
        <RegistrationForm onStart={setParams} />
      )}
    </Page>
  )
}

function RegistrationForm({
  onStart,
}: {
  onStart: (params: RegistrationParams) => void
}) {
  const { chainId } = useNetwork()
  const wallet = useWalletOnNetwork()
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [yearsInput, setYearsInput] = useState('1')
  const [token, setToken] = useState<PaymentToken>('usdc')
  const years = Number(yearsInput)
  const validYears = Number.isInteger(years) && years >= 1 && years <= 100

  const name = useNameAvailability({
    input: nameInput,
    years: validYears ? years : 0,
    token,
  })

  const nameError =
    name.error ?? (name.isAvailable === false ? 'Not available' : undefined)
  // Only start for the name that's on screen, never one checked a moment ago
  const isChecked =
    !name.isTyping && parseLabel(nameInput)?.label === name.label
  const canStart =
    isChecked &&
    !!name.label &&
    name.isAvailable === true &&
    !!name.price &&
    validYears

  return (
    <>
      <Card>
        <Input
          label="Name"
          placeholder="yourname"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          suffix={
            name.isTyping || name.isLoading ? <Spinner /> : <span>.eth</span>
          }
          error={nameError}
          hint={
            name.isAvailable && name.label ? (
              <span {...styles.available()}>{name.label}.eth is available</span>
            ) : undefined
          }
        />

        <div {...styles.fields()}>
          <Input
            label="Years"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={yearsInput}
            onChange={(e) => setYearsInput(e.target.value)}
            error={yearsInput && !validYears ? '1 to 100 years' : undefined}
          />
          <div {...styles.tokenField()}>
            <span {...styles.tokenLabel()}>Pay with</span>
            <div
              role="radiogroup"
              aria-label="Payment token"
              {...styles.tokens()}
            >
              {(Object.keys(PAYMENT_TOKENS) as PaymentToken[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={t === token}
                  onClick={() => setToken(t)}
                  {...cx(styles.token(), t === token && styles.tokenActive())}
                >
                  {PAYMENT_TOKENS[t].symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        {name.price && (
          <div>
            {name.price.premium > 0n && (
              <Row label="Premium">
                {formatAmount(
                  name.price.premium,
                  PAYMENT_TOKENS[token].decimals
                )}{' '}
                {PAYMENT_TOKENS[token].symbol}
              </Row>
            )}
            <Row label="Total">
              {formatAmount(name.price.total, PAYMENT_TOKENS[token].decimals)}{' '}
              {PAYMENT_TOKENS[token].symbol}
            </Row>
          </div>
        )}

        {!wallet.isConnected ? (
          <Button onClick={() => setWalletModalOpen(true)}>
            Connect wallet
          </Button>
        ) : !wallet.isOnNetwork ? (
          <Button onClick={wallet.switchToNetwork} loading={wallet.isSwitching}>
            Switch wallet to {wallet.networkName}
          </Button>
        ) : (
          <Button
            disabled={!canStart}
            onClick={() =>
              canStart &&
              wallet.address &&
              name.label &&
              onStart({
                chainId,
                account: wallet.address,
                label: name.label,
                years,
                token,
              })
            }
          >
            Register
          </Button>
        )}
      </Card>

      {chainId === sepolia.id && <TestnetFaucet token={token} />}
      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </>
  )
}

function RegistrationFlow({
  params,
  onExit,
}: {
  params: RegistrationParams
  onExit: () => void
}) {
  const { state, start, register, reset } = useRegistration(params)
  const name = `${params.label}.eth`
  const busy = !!state.txStatus || !!state.checking
  const ready =
    state.phase === 'wait' && !!state.readyAt && state.readyAt <= Date.now()

  // Kick off the setup as soon as the flow opens. If this registration was
  // already committed (e.g. before a reload), `start` resumes from there.
  useEffect(() => {
    start()
  }, [start])

  if (state.phase === 'done') {
    return <Registered params={params} registerHash={state.hashes.register} />
  }

  return (
    <Card title={`Registering ${name}`}>
      <ol {...styles.steps()}>
        <Step
          state={state}
          step="setup"
          title={
            state.batched
              ? 'Set up and commit'
              : 'Set up and commit (up to 3 transactions)'
          }
          description="Deploys your resolver if you don't have one yet, approves the exact price, and commits to a hash of the registration, so the name stays private until it's registered."
        />
        <Step
          state={state}
          step="wait"
          title="Wait for the commitment"
          description={
            state.phase === 'wait' && state.readyAt ? (
              <Countdown until={state.readyAt} />
            ) : (
              'At least 60 seconds, so nobody can front-run the name.'
            )
          }
        />
        <Step
          state={state}
          step="register"
          title="Register"
          description="Reveals the commitment, pays for the name, and points it at your address."
        />
      </ol>

      {state.persisted === false && (
        <Notice>
          Your browser isn't saving progress. Keep this page open until the name
          is registered.
        </Notice>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}

      {state.needsRecord && !state.txStatus && !state.error ? (
        <Button onClick={register}>Set {name}'s address</Button>
      ) : state.phase === 'wait' && ready && !state.error ? (
        <Button onClick={register}>Register {name}</Button>
      ) : state.error ? (
        <Button
          onClick={
            state.phase === 'register' || (state.phase === 'wait' && ready)
              ? register
              : start
          }
        >
          Try again
        </Button>
      ) : (
        <Button loading disabled>
          {state.checking
            ? 'Checking…'
            : state.txStatus === 'sign'
              ? 'Confirm in your wallet'
              : state.txStatus === 'confirm'
                ? 'Waiting for confirmation'
                : 'Waiting…'}
        </Button>
      )}

      <Button
        tone="ghost"
        size="small"
        disabled={busy}
        onClick={() => {
          // Before committing there's nothing to lose. After, the saved
          // commitment is kept so this registration can be resumed.
          if (state.phase === 'idle' || state.phase === 'setup') reset()
          onExit()
        }}
      >
        Back
      </Button>
    </Card>
  )
}

const STEP_ORDER: Phase[] = ['idle', 'setup', 'wait', 'register', 'done']

function Step({
  state,
  step,
  title,
  description,
}: {
  state: RegistrationState
  step: Exclude<Phase, 'idle' | 'done'>
  title: string
  description: ReactNode
}) {
  const current = STEP_ORDER.indexOf(state.phase)
  const index = STEP_ORDER.indexOf(step)
  const status =
    current > index
      ? 'done'
      : current === index
        ? state.error
          ? 'error'
          : 'active'
        : 'pending'

  return (
    <li {...styles.step()}>
      <span {...styles.stepIcon({ status })} aria-hidden>
        {status === 'done' ? (
          '✓'
        ) : status === 'active' ? (
          <Spinner size={12} />
        ) : (
          index
        )}
      </span>
      <span {...styles.stepText()}>
        <span {...styles.stepTitle()}>{title}</span>
        <span {...styles.stepDescription()}>{description}</span>
      </span>
    </li>
  )
}

function Countdown({ until }: { until: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])
  const seconds = Math.max(0, Math.ceil((until - now) / 1000))
  return <>{seconds > 0 ? `${seconds} seconds left` : 'Ready to register'}</>
}

/** The registered name, and the optional last step: making it primary */
function Registered({
  params,
  registerHash,
}: {
  params: RegistrationParams
  registerHash?: Hash
}) {
  const name = `${params.label}.eth`
  const client = useEnsClient(params.chainId)
  const queryClient = useQueryClient()
  const [primary, setPrimary] = useState<{
    status: 'idle' | 'pending' | 'done' | 'error'
    error?: string
  }>({ status: 'idle' })

  async function setAsPrimary() {
    setPrimary({ status: 'pending' })
    try {
      const hash = await sendTransaction(config, {
        chainId: params.chainId,
        account: params.account,
        ...getSetPrimaryNameCall(client, params.account, name),
      })
      await confirmTransaction(params.chainId, hash)
      // Refresh every name shown on the page, like the one in the nav
      await queryClient.invalidateQueries()
      setPrimary({ status: 'done' })
    } catch (err) {
      setPrimary({ status: 'error', error: getErrorMessage(err) })
    }
  }

  return (
    <Card title={`You registered ${name}`}>
      <Notice tone="success">
        {name} is yours and already resolves to your address.
      </Notice>
      <div>
        <Row label="Resolves to">
          <Identity address={params.account} name={name} />
        </Row>
        {registerHash && (
          <Row label="Transaction">
            <a
              href={`${explorerUrl(params.chainId)}/tx/${registerHash}`}
              target="_blank"
              rel="noopener noreferrer"
              {...styles.link()}
            >
              View on explorer
            </a>
          </Row>
        )}
      </div>

      {primary.status === 'done' ? (
        <Notice tone="success">
          {name} is now your primary name. Apps will show it instead of your
          address.
        </Notice>
      ) : (
        <>
          {primary.error && <Notice tone="error">{primary.error}</Notice>}
          <Button
            tone="secondary"
            loading={primary.status === 'pending'}
            onClick={setAsPrimary}
          >
            Set as primary name
          </Button>
        </>
      )}
    </Card>
  )
}

namespace styles {
  export const available = style({ color: 'var(--green)' })

  export const fields = style({
    display: 'grid',
    gap: '1rem',
    '@media (min-width: 640px)': {
      gridTemplateColumns: '1fr 1fr',
      alignItems: 'start',
    },
  })

  export const tokenField = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  })

  export const tokenLabel = style({
    paddingLeft: '0.25rem',
    fontWeight: 500,
    fontSize: '0.75rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
  })

  export const tokens = style({
    display: 'flex',
    gap: '0.25rem',
    height: '3.25rem',
    padding: '0.25rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--surface)',
  })

  export const token = style({
    flex: 1,
    border: 'none',
    borderRadius: '0.5rem',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
    cursor: 'pointer',
    ':focus-visible': { outline: '2px solid var(--blue)' },
  })

  export const tokenActive = style({
    backgroundColor: 'var(--blue-light)',
    color: 'var(--blue)',
  })

  export const steps = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    margin: 0,
    padding: 0,
    listStyle: 'none',
  })

  export const step = style({
    display: 'flex',
    gap: '0.75rem',
  })

  export const stepIcon = variants({
    base: {
      display: 'flex',
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      width: '1.75rem',
      height: '1.75rem',
      borderRadius: '50%',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.8125rem',
      fontWeight: 500,
    },
    variants: {
      status: {
        pending: {
          backgroundColor: 'var(--surface-secondary)',
          color: 'var(--text-tertiary)',
        },
        active: { backgroundColor: 'var(--blue-light)', color: 'var(--blue)' },
        done: { backgroundColor: 'var(--green-light)', color: 'var(--green)' },
        error: {
          backgroundColor: 'var(--error-light)',
          color: 'var(--error-text)',
        },
      },
    },
  })

  export const stepText = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
    paddingTop: '0.125rem',
  })

  export const stepTitle = style({ fontWeight: 500 })

  export const stepDescription = style({
    color: 'var(--text-secondary)',
    fontSize: '0.9375rem',
    lineHeight: 1.35,
  })

  export const link = style({
    color: 'var(--blue)',
    textDecoration: 'underline',
  })
}
