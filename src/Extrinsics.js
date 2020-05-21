import React, { useEffect, useState } from 'react';
import { Grid, Form, Dropdown, Input } from 'semantic-ui-react';

import { useSubstrate } from './substrate-lib';
import { TxButton, TxGroupButton } from './substrate-lib/components';

function Main (props) {
  const { api } = useSubstrate();
  const { accountPair } = props;
  const [status, setStatus] = useState(null);
  const [interxType, setInterxType] = useState('EXTRINSIC');
  const [pallets, setPallets] = useState([]);
  const [rpcs, setRpcs] = useState([]);

  const [queries, setQueries] = useState([]);
  const [extrinsics, setExtrinsics] = useState([]);
  const [rpcCallables, setRpcCallables] = useState([]);

  const [paramFields, setParamFields] = useState([]);

  const initFormState = {
    palletRpc: '',
    callable: '',
    inputParams: []
  };

  const [formState, setFormState] = useState(initFormState);
  const { palletRpc, callable, inputParams } = formState;

  const updatePalletsRPCs = () => {
    const pallets = Object.keys(api.tx).sort()
      .map(pallet => ({ key: pallet, value: pallet, text: pallet }));
    setPallets(pallets);

    const rpcs = Object.keys(api.rpc).sort()
      .map(rpc => ({ key: rpc, value: rpc, text: rpc }));
    setRpcs(rpcs);
  };

  const showPalletsRPCs = () => {
    if (interxType === 'QUERY' || interxType === 'EXTRINSIC') {
      return pallets;
    }
    return rpcs;
  };

  const updateCallables = () => {
    if (!api || palletRpc === '') { return; }

    // For pallet queries
    let queries = [];
    if (api.query[palletRpc]) {
      queries = Object.keys(api.query[palletRpc]).sort()
        .map(callable => ({ key: callable, value: callable, text: callable }));
    }
    setQueries(queries);

    // For pallet extrinsics
    let extrinsics = [];
    if (api.tx[palletRpc]) {
      extrinsics = Object.keys(api.tx[palletRpc]).sort()
        .map(callable => ({ key: callable, value: callable, text: callable }));
    }
    setExtrinsics(extrinsics);

    // For RPC callables
    let rpcCallables = [];
    if (api.rpc[palletRpc]) {
      rpcCallables = Object.keys(api.rpc[palletRpc]).sort()
        .map(callable => ({ key: callable, value: callable, text: callable }));
    }
    setRpcCallables(rpcCallables);

    // Clear param fields
    setParamFields([]);
  };

  const showCallables = () => {
    if (interxType === 'QUERY') {
      return queries;
    } else if (interxType === 'EXTRINSIC') {
      return extrinsics;
    }
    return rpcCallables;
  };

  const updateParamFields = () => {
    // TODO: Not sure how to perform RPC params detection. Disable it for now.
    if (palletRpc === '' || callable === '' || interxType === 'RPC') {
      setParamFields([]);
      return;
    }

    let paramFields = [];

    if (interxType === 'QUERY') {
      const metaType = api.query[palletRpc][callable].meta.type;
      if (metaType.isPlain) {
        // Do nothing as `paramFields` is already set to []
      } else if (metaType.isMap) {
        paramFields = [{
          name: metaType.asMap.key.toString(),
          type: metaType.asMap.key.toString()
        }];
      } else if (metaType.isDoubleMap) {
        paramFields = [{
          name: metaType.asDoubleMap.key1.toString(),
          type: metaType.asDoubleMap.key1.toString()
        }, {
          name: metaType.asDoubleMap.key2.toString(),
          type: metaType.asDoubleMap.key2.toString()
        }];
      }
    } else if (interxType === 'EXTRINSIC') {
      const metaArgs = api.tx[palletRpc][callable].meta.args;
      if (metaArgs && metaArgs.length > 0) {
        paramFields = metaArgs.map(arg => ({
          name: arg.name.toString(),
          type: arg.type.toString()
        }));
      }
    }

    setParamFields(paramFields);
  };

  useEffect(updatePalletsRPCs, [api]);
  useEffect(updateCallables, [api, palletRpc]);
  useEffect(updateParamFields, [api, interxType, palletRpc, callable]);

  const onPalletCallableParamChange = (_, data) => {
    setFormState(formState => {
      let res;
      const { state, value } = data;
      if (typeof state === 'object') {
        // Input parameter updated
        const { ind, type } = state;
        const inputParams = [...formState.inputParams];
        inputParams[ind] = { type, value };
        res = { ...formState, inputParams };
      } else if (state === 'palletRpc') {
        res = { ...formState, [state]: value, callable: '', inputParams: [] };
      } else if (state === 'callable') {
        res = { ...formState, [state]: value, inputParams: [] };
      }
      return res;
    });
  };

  const onInterxTypeChange = (ev, data) => {
    setInterxType(data.value);
    // clear the formState
    setFormState(initFormState);
  };

  return (
    <Grid.Column>
      <h1>Pallet Interactor</h1>
      <Form>
        <Form.Group inline>
          <label>Interaction Type</label>
          <Form.Radio
            label='Query'
            name='interxType'
            value='QUERY'
            checked={interxType === 'QUERY'}
            onChange={onInterxTypeChange}
          />
          <Form.Radio
            label='Extrinsic'
            name='interxType'
            value='EXTRINSIC'
            checked={interxType === 'EXTRINSIC'}
            onChange={onInterxTypeChange}
          />
          <Form.Radio
            label='RPC'
            name='interxType'
            value='RPC'
            checked={interxType === 'RPC'}
            onChange={onInterxTypeChange}
          />
        </Form.Group>
        <Form.Field>
          <Dropdown
            placeholder='Pallets / RPC'
            fluid
            label='Pallet / RPC'
            onChange={onPalletCallableParamChange}
            search
            selection
            state='palletRpc'
            value={palletRpc}
            options={showPalletsRPCs()}
          />
        </Form.Field>
        <Form.Field>
          <Dropdown
            placeholder='Callables'
            fluid
            label='Callable'
            onChange={onPalletCallableParamChange}
            search
            selection
            state='callable'
            value={callable}
            options={showCallables()}
          />
        </Form.Field>
        {paramFields.map((paramField, ind) =>
          <Form.Field key={`${paramField.name}-${paramField.type}`}>
            <Input
              placeholder={paramField.type}
              fluid
              type='text'
              label={paramField.name}
              state={{ ind, type: paramField.type }}
              onChange={onPalletCallableParamChange}
            />
          </Form.Field>
        )}
        <Form.Field style={{ textAlign: 'center' }}>
          <InteractorSubmit
            accountPair={accountPair}
            setStatus={setStatus}
            attrs={{ interxType, palletRpc, callable, inputParams, paramFields }}
          />
        </Form.Field>
        <div style={{ overflowWrap: 'break-word' }}>{status}</div>
      </Form>
    </Grid.Column>
  );
}

function InteractorSubmit (props) {
  const { attrs } = props;
  if (attrs.interxType === 'QUERY') {
    return <TxButton
      label = 'Query'
      type = 'QUERY'
      color = 'blue'
      {...props}
    />;
  } else if (attrs.interxType === 'EXTRINSIC') {
    return <TxGroupButton {...props} />;
  } else {
    // attrs.interxType === RPC
    // Disable RPC first, as we don't know how to detect its param types
    return <TxButton
      label = 'Submit'
      type = 'RPC'
      disabled
      {...props}
    />;
  }
}

export default function Extrinsics (props) {
  const { api } = useSubstrate();
  return api.tx ? <Main {...props} /> : null;
}
