import React from "react";
import { Button } from "semantic-ui-react";
import { web3FromSource } from "@polkadot/extension-dapp";

import { useSubstrate } from "../";

export default function TxButton({
  accountPair = null,
  label,
  setStatus,
  style = null,
  type = null,
  attrs = null,
  disabled = false
}) {
  const { api } = useSubstrate();
  let { params = null, sudo = false, tx = null } = attrs;
  const isQuery = () => type === "QUERY";

  const transaction = async() => {
    const { address, meta: { source, isInjected } } = accountPair;
    let fromParam;

    //set the signer
    if (isInjected) {
      const injected = await web3FromSource(source);
      fromParam = address;
      api.setSigner(injected.signer);
    } else {
      fromParam = accountPair;
    }
    setStatus("Sending...");

    // Check if tx has args
    let hasArgs = params.length && params[0].length ? params : undefined;
    let txExecute;

    if (!hasArgs) {
      if (!sudo) {
        txExecute = tx();
      } else {
        txExecute = tx.sudo();
      }
    } else {
      if (!sudo) {
        txExecute = tx(args);
      } else {
        txExecute = tx.sudo(args);
      }
    }

    txExecute.signAndSend(fromParam, ({ status }) => {
      status.isFinalized ?
        setStatus(`Completed at block hash #${status.asFinalized.toString()}`) :
        setStatus(`Current transaction status: ${status.type}`);
    }).catch(e => {
      setStatus(":( transaction failed");
      console.error("ERROR transaction:", e);
    });
  };

  const query = async() => {
    try {
      let result = await tx(...params);
      setStatus(result.toString());
    } catch (e) {
      console.error("ERROR query:", e);
      setStatus(e.toString());
    }
  };

  return (
    <Button primary style = { style }
      type = "submit"
      onClick = { isQuery() ? query : transaction }
      disabled = { disabled || (!tx) || (!isQuery() && !accountPair) }>
      { label }
    </Button>
  );
}