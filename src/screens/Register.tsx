import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import { sendTransaction } from 'wagmi/actions'
import { cx, style, variants } from 'zyzz'

import { Identity } from '../components/Identity'
import { Page } from '../components/Page'
import { TestnetFaucet } from '../components/TestnetFaucet'
import { Button, Card, Input, Notice, Row, Spinner } from '../components/ui'
import { WalletModal } from '../components/WalletModal'
import { useAtomicBatching } from '../hooks/useAtomicBatching'
import { useEnsClient } from '../hooks/useEnsClient'
import { useNameAvailability } from '../hooks/useNameAvailability'
import {
  type Phase,
  type RegistrationParams,
  type RegistrationState,
  type TxProgress,
  findSavedRegistrations,
  useRegistration,
} from '../hooks/useRegistration'
import { useWalletOnNetwork } from '../hooks/useWalletOnNetwork'
import { ensExplorerUrl, sepolia } from '../lib/chains'
import { formatAmount } from '../lib/format'
import { useNetwork } from '../lib/network'
import {
  getPaymentToken,
  getPaymentTokens,
  type PaymentToken,
  type PaymentTokenInfo,
  type TxKind,
  getErrorMessage,
  getSetPrimaryNameCall,
  parseLabel,
} from '../lib/registration'
import { confirmTransaction } from '../lib/transactions'
import { config } from '../lib/wagmi'

export function RegisterScreen() {
  const { chainId } = useNetwork()
  // Locked in once the user starts, so the saved commitment always matches
  const [started, setParams] = useState<RegistrationParams>()

  // Switching networks or accounts closes the flow (a saved commitment is
  // kept and picked up again if the same registration is restarted)
  const { address } = useWalletOnNetwork()
  const params =
    started?.chainId === chainId && started.account === address
      ? started
      : undefined

  return (
    <Page
      title="Register a name"
      description="Register a .eth name on ENSv2. Payment is in stablecoins, and the name points at a resolver you own, so it resolves to your address as soon as it's registered."
      source="src/lib/registration.ts"
    >
      {params ? (
        <RegistrationFlow
          // A fresh flow (and saved progress) per registration
          key={JSON.stringify(params)}
          params={params}
          onExit={() => setParams(undefined)}
        />
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
  const tokens = getPaymentTokens(chainId)
  const [tokenChoice, setToken] = useState<PaymentToken>('usdc')
  // Ask the wallet about batching now, so the answer is cached when the
  // registration starts and its step titles don't change after they render
  useAtomicBatching(chainId)
  // Each network offers different tokens, so fall back to its first one
  const tokenInfo = tokens.find((t) => t.id === tokenChoice) ?? tokens[0]
  const token = tokenInfo.id
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
    !name.isPriceStale &&
    validYears

  // Registrations committed in an earlier visit, which can be picked up again
  // even if the name no longer shows as available
  const saved =
    wallet.address && wallet.isOnNetwork
      ? findSavedRegistrations(chainId, wallet.address)
      : []

  return (
    <>
      {saved.map((params) => (
        <Notice key={`${params.label}:${params.years}:${params.token}`}>
          <span {...styles.saved()}>
            <span>
              You have an unfinished registration for {params.label}.eth
            </span>
            <span {...styles.resume()}>
              <Button
                size="small"
                tone="secondary"
                onClick={() => onStart(params)}
              >
                Resume
              </Button>
            </span>
          </span>
        </Notice>
      ))}
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
              {tokens.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={t.id === token}
                  onClick={() => setToken(t.id)}
                  {...cx(
                    styles.token(),
                    t.id === token && styles.tokenActive()
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {name.price && validYears && (
          <PriceRows
            price={name.price}
            token={getPaymentToken(chainId, name.price.token) ?? tokenInfo}
            isStale={name.isPriceStale}
          />
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

      {chainId === sepolia.id && <TestnetFaucet token={tokenInfo} />}
      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </>
  )
}

/**
 * The price, formatted with the token it was quoted in. While a new token or
 * duration is loading, the last price stays (dimmed) so the layout holds still.
 */
function PriceRows({
  price,
  token,
  isStale,
}: {
  price: { base: bigint; premium: bigint; total: bigint }
  token: PaymentTokenInfo
  isStale: boolean
}) {
  return (
    <div aria-busy={isStale} {...styles.price({ stale: isStale })}>
      {price.premium > 0n && (
        <Row label="Premium">
          {formatAmount(price.premium, token.decimals)} {token.symbol}
        </Row>
      )}
      <Row label="Total">
        {formatAmount(price.total, token.decimals)} {token.symbol}
      </Row>
    </div>
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
  // What the wallet reports up front; `state.batched` is what actually happened
  const canBatch = useAtomicBatching(params.chainId)
  const batched = state.batched ?? canBatch
  const symbol = getPaymentToken(params.chainId, params.token)?.symbol ?? ''
  // Known once the step starts; until then, the usual two
  const registerTxs: TxProgress[] = state.txs.register ?? [
    { kind: 'register', status: 'pending' },
    { kind: 'record', status: 'pending' },
  ]
  const name = `${params.label}.eth`
  const busy = !!state.txStatus || !!state.checking
  const ready = state.phase === 'wait' && !!state.ready

  // Kick off the setup as soon as the flow opens. If this registration was
  // already committed (e.g. before a reload), `start` resumes from there.
  useEffect(() => {
    start()
  }, [start])

  if (state.phase === 'done') {
    return <Registered params={params} />
  }

  return (
    <Card title={`Registering ${name}`}>
      <ol {...styles.steps()}>
        <Step
          state={state}
          step="setup"
          title={
            // Unknown after resuming a commit made before a reload
            !state.txs.setup &&
            !batched &&
            state.phase !== 'setup' &&
            state.phase !== 'idle'
              ? 'Set up and commit'
              : `Set up and commit (${txCount(batched, state.txs.setup?.length, 'up to 3')})`
          }
          description="Deploys your resolver if you don't have one yet, approves the exact price, and commits to a hash of the registration, so the name stays private until it's registered."
          txs={batched ? undefined : state.txs.setup}
          symbol={symbol}
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
          title={`Register (${txCount(batched, registerTxs.length)})`}
          description="Reveals the commitment, pays for the name, and points it at your address."
          txs={batched ? undefined : registerTxs}
          symbol={symbol}
        />
      </ol>

      {batched && (
        <Notice>
          Your wallet supports batched transactions (EIP-5792), so each step
          needs just one confirmation.
        </Notice>
      )}
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
          // Keeps any saved commitment, so this can be resumed later
          reset()
          onExit()
        }}
      >
        Back
      </Button>
    </Card>
  )
}

const STEP_ORDER: Phase[] = ['idle', 'setup', 'wait', 'register', 'done']

function txCount(batched: boolean, count?: number, fallback?: string) {
  if (batched) return '1 transaction'
  if (count === undefined) return `${fallback} transactions`
  return count === 1 ? '1 transaction' : `${count} transactions`
}

/** What each transaction does, shown when they're sent one at a time */
const TX_LABELS: Record<TxKind, (symbol: string) => string> = {
  resolver: () => 'Deploy your resolver (first name only)',
  approve: (symbol) => `Approve the exact price in ${symbol}`,
  commit: () => 'Commit to the registration',
  register: () => 'Register and pay',
  record: () => 'Point the name at your address',
}

function Step({
  state,
  step,
  title,
  description,
  txs,
  symbol = '',
}: {
  state: RegistrationState
  step: Exclude<Phase, 'idle' | 'done'>
  title: string
  description: ReactNode
  txs?: TxProgress[]
  symbol?: string
}) {
  // Once the wait is over, the register step is up next (waiting on a click)
  const isReady = state.phase === 'wait' && !!state.ready
  const phase = isReady ? 'register' : state.phase
  const current = STEP_ORDER.indexOf(phase)
  const index = STEP_ORDER.indexOf(step)
  const status =
    current > index
      ? 'done'
      : current === index
        ? state.error
          ? 'error'
          : 'active'
        : 'pending'
  // Spin only while something is happening, not while waiting for the user
  const isWorking =
    status === 'active' &&
    (step !== 'register' || !!state.txStatus || !!state.checking)

  return (
    <li {...styles.step()}>
      <span {...styles.stepIcon({ status })} aria-hidden>
        {status === 'done' ? '✓' : isWorking ? <Spinner size={12} /> : index}
      </span>
      <span {...styles.stepText()}>
        <span {...styles.stepTitle()}>{title}</span>
        <span {...styles.stepDescription()}>{description}</span>
        {txs && txs.length > 0 && (
          <ol {...styles.txs()}>
            {txs.map((tx, i) => {
              // A whole step that's done has nothing left in flight
              const txStatus = status === 'done' ? 'done' : tx.status
              return (
                <li key={tx.kind} {...styles.tx({ status: txStatus })}>
                  <span {...styles.txIcon()} aria-hidden>
                    {txStatus === 'done' ? (
                      '✓'
                    ) : txStatus === 'active' && status !== 'error' ? (
                      <Spinner size={10} />
                    ) : (
                      `${i + 1}.`
                    )}
                  </span>
                  <span>
                    {TX_LABELS[tx.kind](symbol)}
                    {txStatus === 'active' && state.txStatus === 'sign' && (
                      <span {...styles.txHint()}> · confirm in wallet</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </span>
    </li>
  )
}

function Countdown({ until }: { until: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])
  const seconds = Math.max(0, Math.ceil((until - now) / 1000))
  return <>{seconds > 0 ? `${seconds} seconds left` : 'Ready to register'}</>
}

/** The registered name, and the optional last step: making it primary */
function Registered({ params }: { params: RegistrationParams }) {
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
        <Row label="Explorer">
          <a
            href={ensExplorerUrl(params.chainId, name)}
            target="_blank"
            rel="noopener noreferrer"
            {...styles.link()}
          >
            View on explorer
          </a>
        </Row>
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

  export const saved = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  })

  export const resume = style({ flex: 'none', width: '6.5rem' })

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

  export const price = variants({
    base: { transitionProperty: 'opacity', transitionDuration: '150ms' },
    variants: { stale: { true: { opacity: 0.5 }, false: {} } },
  })

  export const txs = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    margin: '0.375rem 0 0',
    padding: 0,
    listStyle: 'none',
    fontSize: '0.9375rem',
  })

  export const tx = variants({
    base: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    variants: {
      status: {
        pending: { color: 'var(--text-tertiary)' },
        active: { color: 'var(--text)', fontWeight: 500 },
        done: { color: 'var(--text-secondary)' },
      },
    },
  })

  export const txIcon = style({
    display: 'inline-flex',
    justifyContent: 'center',
    width: '1rem',
    flexShrink: 0,
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
  })

  export const txHint = style({
    color: 'var(--blue)',
    fontWeight: 400,
  })

  export const link = style({
    color: 'var(--blue)',
    textDecoration: 'underline',
  })
}
