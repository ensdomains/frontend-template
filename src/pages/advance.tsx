import {
  Button,
  Card,
  Input,
  Spinner,
  RecordItem,
  Tag,
} from "@ensdomains/thorin";
import { isAddress } from "viem/utils";
import { NextSeo } from "next-seo";
import { useDebounce } from "usehooks-ts";
import { useEnsAddress, useEnsResolver, useEnsName } from "wagmi";
import { useState } from "react";
import { useEnsText } from "@/hooks/useEnsText";

import { Container, Layout } from "@/components/templates";

export default function Page() {
  const [input, setInput] = useState("");
  const debouncedInput = useDebounce(input, 500);
  const nameValue = debouncedInput.includes(".") ? debouncedInput : undefined;

  // Resolve potential ENS names (dot separated strings)
  const { data: ensAddress, isLoading: ensAddressIsLoading } = useEnsAddress({
    name: nameValue,
    chainId: 1,
  });

  const { data: ensResolver, isLoading: ensResolverIsLoading } = useEnsResolver(
    {
      name: nameValue,
      chainId: 1,
    }
  );
  const { data: twitter } = useEnsText({
    name: nameValue,
    key: "com.twitter",
    chainId: 1,
  });

  const {
    data: primaryName,
    isError,
    isLoading,
  } = useEnsName({
    address: ensAddress,
  });

  // Set the address (address if provided directly or resolved address from ENS name)
  const address =
    input !== debouncedInput
      ? undefined
      : isAddress(debouncedInput)
      ? debouncedInput
      : ensAddress;

  return (
    <>
      <NextSeo title="Input" />

      <Layout>
        <header />

        <Container as="main">
          <Card title="Name/Address Input">
            <Input
              label="Address or ENS Name"
              placeholder="nick.eth"
              description={ensAddress && address}
              suffix={ensAddressIsLoading && <Spinner />}
              onChange={(e) => setInput(e.target.value)}
            />

            <Button disabled={!address} colorStyle="greenPrimary">
              {!address ? "No Address" : "Nice!"}
            </Button>
          </Card>
          <Card>
            {nameValue && (
              <Tag>
                {primaryName === nameValue
                  ? "Primary Name"
                  : "Not Primary Name"}
              </Tag>
            )}

            <RecordItem keyLabel="ENS Address" size="small">
              {address}
            </RecordItem>
            <RecordItem keyLabel="Resolver" size="small">
              {ensResolver &&
              ensResolver !== "0x0000000000000000000000000000000000000000"
                ? ensResolver
                : ""}
            </RecordItem>
            {twitter && (
              <RecordItem keyLabel="Twitter" size="small">
                <a
                  href={`https://www.twitter.com/${twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @{twitter}
                </a>
              </RecordItem>
            )}
          </Card>
        </Container>

        <footer />
      </Layout>
    </>
  );
}
