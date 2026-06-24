import { JsonRpcProvider, Wallet, Contract, AbiCoder, keccak256, hexlify, randomBytes } from "ethers";
import { readFileSync } from "node:fs";
const A=JSON.parse(readFileSync("/home/k/Documents/datum/alpha-core/deployed-addresses.json","utf8"));
const RELAY="http://127.0.0.1:3400", PUB="0x749aC2097B5F12788dA3ee80FF4D017c799E8AdD", CAMP=85n, ZH="0x"+"0".repeat(64), Z="0x"+"0".repeat(40);
const PATH=process.argv[2];
const p=new JsonRpcProvider("https://eth-rpc-testnet.polkadot.io/");
const u=Wallet.createRandom().connect(p);
const s=new Contract(A.settlement,["function lastNonce(address,uint256,uint8) view returns (uint256)","function lastClaimHash(address,uint256,uint8) view returns (bytes32)"],p);
const v=new Contract(A.paymentVault,["function userBalance(address) view returns (uint256)"],p);
const pw=new Contract(A.powEngine,["function powTargetForUser(address,uint256) view returns (uint256)"],p);
const cr=new Contract(A.clickRegistry,["function hasUnclaimed(address,uint256,bytes32) view returns (bool)"],p);
const post=async(path,b)=>{const r=await fetch(RELAY+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});return await r.json().catch(()=>({}));};
const mine=(h,t)=>{const b=h.slice(2);for(let i=0;i<5e6;i++){const nh=i.toString(16).padStart(64,"0");if(BigInt(keccak256("0x"+b+nh))<=t)return"0x"+nh;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const at = PATH==="click"?1:2;
const rate = PATH==="click"?10_000_000_000_000_000n:50_000_000_000_000_000n;
let click=ZH, asig=Array(3).fill(ZH), fnOv=null, prevOv=null;
if (PATH==="click"){ const n=hexlify(randomBytes(32)); console.log("/click",JSON.stringify(await post("/click",{user:u.address,campaignId:"85",nonce:n})).slice(0,70)); for(let i=0;i<20&&!(await cr.hasUnclaimed(u.address,CAMP,n).catch(()=>0));i++)await sleep(3000); console.log("recorded:",await cr.hasUnclaimed(u.address,CAMP,n)); click=n; }
if (PATH==="action"){ const a=await post("/action-attest",{user:u.address,campaignId:"85",eventCount:"1",rateWei:rate.toString(),publisher:PUB}); console.log("/action-attest ok:",a.ok); asig=a.actionSig; fnOv=BigInt(a.firstNonce); prevOv=a.prevHash; }
const last = fnOv!=null?fnOv-1n:BigInt(await s.lastNonce(u.address,CAMP,at));
const prev = prevOv!=null?prevOv:String(await s.lastClaimHash(u.address,CAMP,at));
const fn=last+1n, head=BigInt(await p.getBlockNumber()), dl=head+1000n, ev=1n;
const ch=keccak256(AbiCoder.defaultAbiCoder().encode(["uint256","address","address","uint256","uint256","uint8","bytes32","uint256","bytes32","bytes32"],[CAMP,PUB,u.address,ev,rate,at,click,fn,prev,ZH]));
const pn=mine(ch,BigInt(await pw.powTargetForUser(u.address,ev)));
const sig=await u.signTypedData({name:"DatumRelay",version:"1",chainId:420420417n,verifyingContract:A.relay},{ClaimBatch:[{name:"user",type:"address"},{name:"campaignId",type:"uint256"},{name:"firstNonce",type:"uint256"},{name:"lastNonce",type:"uint256"},{name:"claimCount",type:"uint256"},{name:"deadlineBlock",type:"uint256"}]},{user:u.address,campaignId:CAMP,firstNonce:fn,lastNonce:fn,claimCount:1n,deadlineBlock:dl});
const env={user:u.address,campaignId:"85",firstNonce:fn.toString(),deadlineBlock:dl.toString(),expectedRelaySigner:Z,expectedAdvertiserRelaySigner:Z,userSig:sig,claims:[{publisher:PUB,eventCount:ev.toString(),rateWei:rate.toString(),actionType:at,proof:[{clickSessionHash:click,stakeRootUsed:ZH,nullifier:ZH,powNonce:pn,zkProof:Array(8).fill(ZH),actionSig:asig}]}]};
console.log("submit",JSON.stringify(await post("/relay/submit",{batches:[env]})).slice(0,55));
console.log("flush",JSON.stringify(await post("/relay/flush",{})));
let bal=0n;for(let i=0;i<20;i++){await sleep(3000);bal=BigInt(await v.userBalance(u.address).catch(()=>0n));if(bal>0n)break;}
console.log(PATH.toUpperCase(),"RESULT userBalance:",bal.toString(),bal>0n?"✅ SETTLED":"❌");
