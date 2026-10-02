param(
  [ValidateRange(1,5)][int]$StrategyId = 1,
  [string]$Account = "banda-admin",
  [switch]$Broadcast
)
$ErrorActionPreference = "Stop"
$navRpc = $env:ROBINHOOD_TESTNET_RPC_URL
if ([string]::IsNullOrWhiteSpace($navRpc)) { throw "Set ROBINHOOD_TESTNET_RPC_URL in this terminal first." }
function Invoke-NavCast {
  param([string[]]$CastArgs)
  $result = & cast @CastArgs
  if ($LASTEXITCODE -ne 0) { throw "RPC/Foundry operation failed. No further operations will run." }
  return $result
}
$chain = Invoke-NavCast -CastArgs @("chain-id", "--rpc-url", $navRpc)
if ([int]$chain -ne 46630) { throw "Expected Robinhood testnet (46630)." }
$diamond = "0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7"
$adapterOutput = Invoke-NavCast -CastArgs @("call", $diamond, "navGuard()(address,uint48)", "--rpc-url", $navRpc)
$adapter = ($adapterOutput | Select-Object -First 1).Trim()
$strategyOutput = Invoke-NavCast -CastArgs @("call", $diamond, "strategy(uint32)(address,uint96,uint16,address,bool)", "$StrategyId", "--rpc-url", $navRpc)
$strategy = ($strategyOutput | Select-Object -First 1).Trim()
$signer = (Invoke-NavCast -CastArgs @("wallet", "address", "--account", $Account)).Trim()
# Preserve the existing mock price. This script does not publish market prices.
$quote = Invoke-NavCast -CastArgs @("call", $adapter, "quotes(address)(uint256,uint256,uint256,bool)", $strategy, "--rpc-url", $navRpc)
$price = (($quote | Select-Object -First 1) -split " ")[0]
if ([bigint]$price -le 0) { throw "An existing nonzero mock price is required." }
$header = (Invoke-NavCast -CastArgs @("rpc", "eth_getBlockByNumber", "latest", "false", "--rpc-url", $navRpc)) | ConvertFrom-Json
if (-not $header.l1BlockNumber) { throw "Missing parent block metadata; refusing to substitute the L2 block number." }
$parentBlock = [Convert]::ToUInt64($header.l1BlockNumber.Substring(2), 16)
$observedTimestamp = [Convert]::ToUInt64($header.timestamp.Substring(2), 16)
$arguments = @($adapter, "setQuote(address,uint256,uint256,uint256,bool)", $strategy, $price, "$observedTimestamp", "$parentBlock", "true", "--rpc-url", $navRpc)
Invoke-NavCast -CastArgs (@("call") + $arguments + @("--from", $signer))
Write-Host "Quote simulation passed for strategy $StrategyId. Parent block: $parentBlock."
if ($Broadcast) {
  Invoke-NavCast -CastArgs (@("send") + $arguments + @("--chain-id", "46630", "--account", $Account))
} else {
  Write-Host "Read-only run. Add -Broadcast to submit the mock quote update."
}
