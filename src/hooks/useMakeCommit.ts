'use client'

import { addEnsContracts } from '@ensdomains/ensjs'
import type { RegistrationParameters } from '@ensdomains/ensjs/utils'
import { commitName } from '@ensdomains/ensjs/wallet'
import { useMutation } from '@tanstack/react-query'
import { useConfig, useWalletClient } from 'wagmi'

export function useMakeCommit() {
  const config = useConfig()
  const mainnet = config.chains.find((chain) => chain.id === 1)

  if (!mainnet) {
    throw new Error('Ensjs write hooks only work on mainnet')
  }

  const ensWalletClient = useWalletClient({
    config: {
      ...config,
      chains: [addEnsContracts(mainnet)],
      transports: {
        [mainnet.id]: config._internal.transports[mainnet.id],
      },
    },
  })

  if (!ensWalletClient.data) {
    throw new Error('No wallet client found')
  }

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: ['makeCommit'],
    mutationFn: async (registrationParams: RegistrationParameters) => {
      return {
        commitName: commitName(ensWalletClient.data, registrationParams),
        commitNameAsync: await commitName(
          ensWalletClient.data,
          registrationParams
        ),
      }
    },
  })

  return {
    ...result,
    makeCommit: mutate,
    makeCommitAsync: mutateAsync,
  }
}
