"use client";

import { useState, useEffect } from "react";
import { useTeams, useStatus, TeamData } from "@/hooks/useBackendData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { WithdrawSection } from "@/components/WithdrawSection";

// 合约ABI - bet函数
const BET_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_teamId", type: "uint256" }],
    name: "bet",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// 合约地址
const CONTRACT_ADDRESS: `0x${string}` = (process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xb5c4bea741cea63b2151d719b2cca12e80e6c7e8") as `0x${string}`;

// Single team betting card component
function TeamBetCard({
  team,
  totalPool,
}: {
  team: TeamData;
  totalPool: number;
}) {
  // 从 TeamData 转换/重命名 props 以匹配组件的期望
  const teamProps = {
    ...team,
    total_bet_wei: (team.prize_pool_eth * 10 ** 18).toString(),
    supporters: team.bets_count,
  };

  console.log("TeamBetCard rendering for team:", team.id, team.name);

  const [betAmount, setBetAmount] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { data: status } = useStatus();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 添加调试信息
  console.log("TeamBetCard render:", {
    teamId: team.id,
    address,
    isPending,
    isConfirming,
    isSuccess,
    error: error?.message,
    hash,
  });

  useEffect(() => {
    console.log("useEffect triggered:", { isSuccess, address, hash });
    if (isSuccess && address) {
      // Transaction successful - backend event listeners will automatically sync on-chain data
      console.log(
        "Bet transaction successful, backend will sync automatically via event listeners"
      );

      // Invalidate queries to refetch data after a successful bet
      // Add a delay to allow backend event listeners to process transaction
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["teams"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["status"] });

        // 关闭弹窗和重置状态
        setIsOpen(false);
        setBetAmount("");
        reset();
      }, 5000); // Wait 5 seconds for backend to sync
    }
  }, [isSuccess, address, team.id, betAmount, queryClient, reset]);

  const calculateOdds = () => {
    const userAmount = parseFloat(betAmount) || 0;
    const teamPool = parseFloat(teamProps.total_bet_wei) / 10 ** 18;
    const totalPoolAmount =
      parseFloat(status?.total_prize_pool_wei || "0") / 10 ** 18;
    const finalPool = totalPoolAmount * 0.9;
    if (teamPool === 0) return 0;
    return (userAmount / teamPool) * finalPool;
  };

  const handleBet = async () => {
    alert("handleBet 被调用了！"); // 添加alert确保函数被调用
    console.log("handleBet called");

    if (
      !betAmount ||
      isNaN(parseFloat(betAmount)) ||
      parseFloat(betAmount) <= 0
    ) {
      console.log("Invalid bet amount:", betAmount);
      alert("Please enter a valid bet amount (number greater than 0)");
      return;
    }

    if (!address) {
      console.log("No wallet address");
      alert("Please connect your wallet first");
      return;
    }

    const amountInWei = parseEther(betAmount);

    console.log("Placing bet:", {
      teamId: teamProps.id,
      teamName: teamProps.name,
      amount: betAmount,
      amountInWei: amountInWei.toString(),
      contractAddress: CONTRACT_ADDRESS,
      userAddress: address,
      expectedChainId: 11155111, // Sepolia
      betAbi: BET_ABI,
    });

    // 检查是否在正确的网络上
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        console.log("Current chain ID:", chainId);
        if (chainId !== "0xaa36a7") {
          // Sepolia chain ID in hex
          alert("Pls switch to the Sepolia network in your wallet.");
          return;
        }
      } catch (chainError) {
        console.error("Error checking chain:", chainError);
      }
    }

    try {
      console.log("Calling writeContract with params:", {
        address: CONTRACT_ADDRESS,
        functionName: "bet",
        args: [BigInt(teamProps.id)],
        value: amountInWei.toString(),
        gas: "100000",
      });

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: BET_ABI,
        functionName: "bet",
        args: [BigInt(teamProps.id)],
        value: amountInWei,
        gas: BigInt(200000), // 增加 gas limit
      });
      console.log("writeContract called successfully");
    } catch (err) {
      console.error("writeContract error:", err);
      alert(
        `Contract call failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }\nPlease check the console for more information`
      );
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && !isSuccess) {
      // 关闭时重置状态，如果不是成功关闭
      setBetAmount("");
      reset();
    }
  };

  return (
    <Card className="glass-red glow-hover border-red-400/30 transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-red-300">{teamProps.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-200">
          Total Bets:{" "}
          {(parseFloat(teamProps.total_bet_wei) / 10 ** 18).toFixed(6)} ETH
        </p>
        <p className="text-sm text-red-200">
          Supporters: {teamProps.supporters}
        </p>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full mt-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white glow-hover">
              Bet
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-red border-red-400/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-300">
                Bet on {teamProps.name}
              </DialogTitle>
              <DialogDescription className="text-red-200">
                Enter your bet amount and confirm the transaction. Team ID:{" "}
                {teamProps.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-white">
                  Bet Amount (ETH)
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0.01"
                  className="bg-red-900/50 border-red-400/50 text-white placeholder-red-300"
                />
              </div>
              {betAmount && parseFloat(betAmount) > 0 && (
                <div className="p-4 bg-red-900/30 rounded border border-red-400/30">
                  <p className="text-sm text-red-100">
                    Expected Payout: {calculateOdds().toFixed(6)} ETH
                  </p>
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-900/50 rounded border border-red-500/50">
                  <p className="text-sm text-red-300">Error: {error.message}</p>
                </div>
              )}
              {isSuccess && (
                <div className="p-4 bg-green-900/30 rounded border border-green-400/50">
                  <p className="text-sm text-green-300">
                    ✅ Transaction Successful!
                  </p>
                  <p className="text-xs text-green-400 break-all">
                    Transaction Hash: {hash}
                  </p>
                </div>
              )}
              <Button
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold glow-hover border border-red-400/50"
                onClick={handleBet}
                disabled={
                  isPending ||
                  isConfirming ||
                  !betAmount ||
                  parseFloat(betAmount) <= 0
                }
              >
                {isPending
                  ? "Confirm in wallet..."
                  : isConfirming
                  ? "Transaction processing..."
                  : `Confirm Bet ${betAmount || "0"} ETH`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: status } = useStatus();
  const { isConnected } = useAccount();

  // 计算总奖池
  const totalPool = status
    ? parseFloat(status.total_prize_pool_wei) / 10 ** 18
    : 0;

  // Check game status
  if (status && status.status !== 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl mb-4">Betting Closed</h1>
          <p className="text-slate-400">Current Status: {status.status_text}</p>
          {status.winning_team_id !== null && status.winning_team_id !== 0 && (
            <p className="text-yellow-400 mt-2">
              Winning Team ID: {status.winning_team_id}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 检查钱包连接
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-red-gradient flex items-center justify-center relative">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: "url('/bg.png')",
          }}
        />
        <div className="absolute inset-0 bg-black-glass" />
        <div className="text-center glass-red rounded-2xl p-8 glow relative z-10">
          <h1 className="text-2xl mb-4 text-red-100">
            Please Connect Your Wallet
          </h1>
          <ConnectButton />
        </div>
      </div>
    );
  }

  // 检查游戏状态
  if (status && status.status !== 0) {
    return (
      <div className="min-h-screen bg-red-gradient flex items-center justify-center relative">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: "url('/bg.png')" }}
        />
        <div className="absolute inset-0 bg-black-glass" />
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-100 mb-4">
              Betting Closed
            </h1>
            <p className="text-red-200 text-xl">
              Current Status: {status.status_text}
            </p>
            {status.winning_team_id !== null &&
              status.winning_team_id !== 0 && (
                <p className="text-yellow-400 mt-2 text-lg">
                  Winning Team ID: {status.winning_team_id}
                </p>
              )}
          </div>

          {/* Withdraw Prize Section */}
          {(status.status === 2 || status.status === 3) && (
            <div className="mb-8">
              <WithdrawSection />
            </div>
          )}

          {/* Return to Home Button */}
          <div className="text-center">
            <Button
              onClick={() => (window.location.href = "/")}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-gradient text-white relative overflow-y-auto">
      {/* Debug Info */}
      <div className="fixed top-0 left-0 bg-black text-white p-2 z-50 text-xs">
        Debug: Page Loaded - {new Date().toLocaleTimeString()}
      </div>
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{
          backgroundImage: "url('/bg.png')",
        }}
      />
      <div className="absolute inset-0 bg-black-glass" />

      <header className="p-4 border-b border-red-400/30 relative z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-glow">CS2 Major Betting</h1>
          <ConnectButton />
        </div>
      </header>

      <main className="p-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 glass-red rounded-xl p-6 glow">
            <h2 className="text-2xl font-bold mb-2 text-red-100">
              Select Team to Bet
            </h2>
            <p className="text-red-200">
              Current Total Prize Pool: {totalPool.toFixed(6)} ETH
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <Skeleton className="h-6 w-20" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-4 w-12" />
                    </CardContent>
                  </Card>
                ))
              : teams?.map((team) => (
                  <TeamBetCard
                    key={team.id}
                    team={team}
                    totalPool={totalPool}
                  />
                ))}
          </div>
        </div>
      </main>
    </div>
  );
}
