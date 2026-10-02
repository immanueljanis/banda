"""Read-only BND-001 network evidence. No credentials or transactions."""
import concurrent.futures, datetime, json, pathlib, subprocess, sys, urllib.request

OUT = pathlib.Path(__file__).parent / 'evidence'
OUT.mkdir(parents=True, exist_ok=True)
TOKENS = {'USDG': '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', 'WETH': '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73'}
TESTNET_TOKENS = {'WETH': '0x7943e237c7F95DA44E0301572D358911207852Fa'}
SLOTS = {'implementation': '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc', 'admin': '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103', 'beacon': '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'}
def request(url, body=None):
    try:
        req=urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type':'application/json','User-Agent':'BandaReadOnlyValidation/1.0'})
        with urllib.request.urlopen(req, timeout=15) as res: return json.load(res)
    except Exception as exc:
        if body is None and url.startswith('https://robinhoodchain.blockscout.com/api/v2/smart-contracts/'):
            try:
                script="[Console]::OutputEncoding=[Text.Encoding]::UTF8; $r=Invoke-WebRequest -UseBasicParsing -Uri '"+url+"' -TimeoutSec 15; [Console]::Write($r.Content)"
                completed=subprocess.run(['powershell','-NoProfile','-Command',script],capture_output=True,text=True,encoding='utf-8-sig',timeout=20,check=True)
                return json.loads(completed.stdout)
            except Exception as fallback: return {'transportError':str(exc),'fallbackError':str(fallback)}
        return {'transportError':str(exc)}
def rpc(url, method, params=[]): return request(url, {'jsonrpc':'2.0','id':1,'method':method,'params':params})
def network(name):
    url=f'https://rpc.{name}.chain.robinhood.com'
    chain=rpc(url,'eth_chainId'); block=rpc(url,'eth_blockNumber'); tag=block.get('result')
    result={'endpoint':url,'chainId':chain,'blockNumber':block,'tokens':{}}
    if not tag: return result
    result['block']=rpc(url,'eth_getBlockByNumber',[tag,False])
    for symbol,address in (TOKENS if name=='mainnet' else TESTNET_TOKENS).items():
        queries={'bytecode':('eth_getCode',[address,tag]), **{k:('eth_getStorageAt',[address,v,tag]) for k,v in SLOTS.items()}, **{k:('eth_call',[{'to':address,'data':v},tag]) for k,v in {'decimals':'0x313ce567','symbol':'0x95d89b41','name':'0x06fdde03','totalSupply':'0x18160ddd','paused':'0x5c975abb','owner':'0x8da5cb5b'}.items()}}
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            calls=dict(zip(queries,pool.map(lambda kv:rpc(url,*kv),queries.values())))
        if name=='mainnet':
            extras=({'l1Address':'0xc2eeeebd','l2Gateway':'0x8fa74a0e'} if symbol=='WETH' else {'globalTransferSettings':'0x5b9d419e','isFrozenProbeAddress':'0xe5839836'+'0000000000000000000000000000000000000000000000000000000000000001','pauseFacet':'0x112b6a67'+'5c975abb'+'0'*56})
            for key,data in extras.items(): calls[key]=rpc(url,'eth_call',[{'to':address,'data':data},tag])
        result['tokens'][symbol]={'address':address,'blockTag':tag,'calls':calls}
        if name=='mainnet':
            for kind,addr in [('proxy',address),('implementation','0x'+calls.get('implementation',{}).get('result','')[-40:])]:
                if len(addr)!=42 or int(addr,16)==0: continue
                data=request('https://robinhoodchain.blockscout.com/api/v2/smart-contracts/'+addr)
                (OUT/f'bnd001-{symbol.lower()}-{kind}-source.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
                result['tokens'][symbol][kind+'Explorer']={k:data.get(k) for k in ['name','is_verified','file_path','implementations','proxy_type']}
    result['blockAfter']=rpc(url,'eth_getBlockByNumber',[tag,False])
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: networks=dict(zip(['mainnet','testnet'],pool.map(network,['mainnet','testnet'])))
checks=[]
def check(label, condition): checks.append({'check':label,'passed':bool(condition)})
def value(calls,key): return calls.get(key,{}).get('result')
def uint(raw):
    try: return int(raw,16)
    except (ValueError,TypeError): return None
def address(raw): return '0x'+raw[-40:].lower() if isinstance(raw,str) and len(raw)==66 else None
def abi_string(raw):
    try:
        data=bytes.fromhex(raw[2:]); offset=int.from_bytes(data[:32],'big'); length=int.from_bytes(data[offset:offset+32],'big')
        if offset!=32 or length>len(data)-offset-32: return None
        return data[offset+32:offset+32+length].decode('utf-8')
    except (ValueError,TypeError,UnicodeDecodeError): return None
for name,expected_chain in [('mainnet',4663),('testnet',46630)]:
    n=networks[name]; tag=n['blockNumber'].get('result'); before=n.get('block',{}).get('result') or {}; after=n.get('blockAfter',{}).get('result') or {}
    check(name+' chain ID',uint(n['chainId'].get('result'))==expected_chain)
    check(name+' pinned block exists',bool(tag) and before.get('number')==tag and bool(before.get('hash')))
    check(name+' pinned block hash unchanged',bool(before.get('hash')) and before.get('hash')==after.get('hash'))
    for symbol in (TOKENS if name=='mainnet' else TESTNET_TOKENS):
        token=n['tokens'].get(symbol,{}); calls=token.get('calls',{}); code=value(calls,'bytecode'); label=name+' '+symbol
        check(label+' all token reads pinned',bool(tag) and token.get('blockTag')==tag)
        check(label+' nonempty bytecode',isinstance(code,str) and code.startswith('0x') and len(code)>2)
        check(label+' decimals',uint(value(calls,'decimals'))==(6 if symbol=='USDG' else 18))
        check(label+' symbol',abi_string(value(calls,'symbol'))==symbol)
        token['decoded']={'decimals':uint(value(calls,'decimals')),'symbol':abi_string(value(calls,'symbol')),'name':abi_string(value(calls,'name'))}
        if name=='mainnet':
            implementation=address(value(calls,'implementation')); proxy=token.get('proxyExplorer',{}); impl=token.get('implementationExplorer',{})
            check(label+' proxy source verified',proxy.get('is_verified') is True)
            check(label+' implementation source verified',impl.get('is_verified') is True)
            check(label+' implementation slot matches explorer',bool(implementation) and any(i.get('address_hash','').lower()==implementation for i in (proxy.get('implementations') or [])))
            if symbol=='WETH':
                check(label+' Ethereum WETH origin',address(value(calls,'l1Address'))=='0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
                check(label+' documented L2 WETH gateway',address(value(calls,'l2Gateway'))=='0x1d187c3e2da52d72bc9c41e3aba0fdfa6a7bf055')
            else: check(label+' pause state readable',uint(value(calls,'paused')) in (0,1))
failures=[c['check'] for c in checks if not c['passed']]
result={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'failed' if failures else 'passed','acceptance':{'checks':checks,'failures':failures},'sources':['https://docs.robinhood.com/chain/connecting/','https://docs.robinhood.com/chain/contracts/','https://docs.robinhood.com/chain/bridging/','https://docs.robinhood.com/chain/protocol-contracts/'],'scope':'Read-only network/token identity checks. Testnet WETH uses documented testnet address; testnet USDG deployment unknown and not asserted available.','limitations':['One public RPC per network; no independently hosted fallback authenticated provider tested.','No actual transfer/buy/sell executed. USDG verified implementation includes pause/freeze checks and role-authorized upgrades; paused=false at snapshot does not prove every account eligible.','WETH is upgradeable aeWETH, not assumed immutable WETH9. USDG reward features in source are not evidence of user yield/APY.','Explorer metadata is current-time, while RPC reads use pinned blocks; implementation comparison is enforced.','Public RPC identity does not independently establish honesty or canonical finality.'],'networks':networks}
(OUT/'bnd001-research.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'status':result['status'],'checksPassed':len(checks)-len(failures),'checksTotal':len(checks),'failures':failures,'evidence':str(OUT/'bnd001-research.json')}))
sys.exit(1 if failures else 0)
