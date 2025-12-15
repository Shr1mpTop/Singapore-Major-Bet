"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import Image from "next/image";
import { useStatus } from "@/hooks/useBackendData";
import Link from "next/link";

// Contract ABI for userBets function
const USER_BETS_ABI = [
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "userBets",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTeams",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "uint256", name: "totalBetAmount", type: "uint256" },
          { internalType: "uint256", name: "supporterCount", type: "uint256" },
        ],
        internalType: "struct CS2MajorBetting.Team[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "winningTeamId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Contract address
const CONTRACT_ADDRESS: `0x${string}` = (process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xb5c4bea741cea63b2151d719b2cca12e80e6c7e8") as `0x${string}`;

// Team name to logo mapping
const TEAM_LOGOS: Record<string, string> = {
  Vitality: "/teams/team vitality.webp",
  Tyloo: "/teams/tyloo.svg",
  G2: "/teams/g2 esports.webp",
  FaZe: "/teams/FaZe Clan.webp",
  Spirit: "/teams/team spirit.webp",
  "Natus Vincere": "/teams/Natus Vincere.svg",
  ENCE: "/teams/ence.svg",
  Heroic: "/teams/heroic.webp",
};

interface UserBet {
  teamId: number;
  teamName: string;
  amount: string;
  amountEth: number;
}

interface Team {
  id: number;
  name: string;
  totalBetAmount: bigint;
  supporterCount: number;
  is_winner?: boolean;
}

export function ViewYourBetsSection() {
  const { address, isConnected } = useAccount();
  const { data: status } = useStatus();

  // Get all teams
  const { data: teams, isLoading: teamsLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: USER_BETS_ABI,
    functionName: "getTeams",
  });

  // Get winning team ID
  const { data: winningTeamId, isLoading: winningTeamLoading } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: USER_BETS_ABI,
      functionName: "winningTeamId",
    });

  // Create an array to store contract calls for all teams
  const userBetCalls = [];

  if (teams && address && isConnected) {
    // Properly handle the readonly array type
    const teamsData = Array.isArray(teams) ? [...teams] : [];

    for (const team of teamsData) {
      userBetCalls.push({
        address: CONTRACT_ADDRESS,
        abi: USER_BETS_ABI,
        functionName: "userBets" as const,
        args: [address as `0x${string}`, BigInt(team.id)],
      });
    }
  }

  // Use useReadContracts to get all user bets in a single call
  const { data: userBetResults, isLoading: userBetsLoading } = useReadContracts(
    {
      contracts: userBetCalls,
      query: {
        enabled: !!address && isConnected && userBetCalls.length > 0,
      },
    }
  );

  // Process the results
  const userBets: UserBet[] = [];

  if (userBetResults && teams && address && isConnected) {
    const teamsData = Array.isArray(teams) ? [...teams] : [];

    for (let i = 0; i < teamsData.length; i++) {
      const team = teamsData[i];
      const betAmount = userBetResults[i]?.result || BigInt(0);

      if (betAmount > BigInt(0)) {
        const teamName = team.name;
        userBets.push({
          teamId: Number(team.id),
          teamName: teamName,
          amount: formatEther(betAmount),
          amountEth: parseFloat(formatEther(betAmount)),
        });
      }
    }

    // Sort by amount (highest first)
    userBets.sort((a, b) => b.amountEth - a.amountEth);
  }

  if (!isConnected) {
    return (
      <motion.section
        id="your-bets-section"
        className="py-24 px-4 relative z-10"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-transparent"></div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: -50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-red-400 via-red-300 to-yellow-400 bg-clip-text text-transparent text-glow tracking-wider mb-4">
              Your Bets
            </h2>
            <p className="text-xl text-red-200 max-w-2xl mx-auto">
              Connect your wallet to view your betting history
            </p>
            <motion.div
              className="w-40 h-2 bg-gradient-to-r from-red-500 to-yellow-500 mx-auto rounded-full mt-6"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            ></motion.div>
          </motion.div>

          <div className="max-w-2xl mx-auto">
            <Card className="glass-red p-8 text-center border-red-500/20">
              <CardContent>
                <p className="text-red-300 text-lg">
                  Please connect your wallet to see your bets.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      id="withdrawsections"
      className="py-24 px-4 relative z-10"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-transparent"></div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <h2 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-red-400 via-red-300 to-yellow-400 bg-clip-text text-transparent text-glow tracking-wider mb-4">
            {status?.status === 2
              ? "Final Results"
              : status?.status === 3
              ? "Refund Available"
              : "Your Bets"}
          </h2>
          <p className="text-xl text-red-200 max-w-2xl mx-auto">
            {status?.status === 2
              ? "View final results and claim your prizes"
              : status?.status === 3
              ? "Get your full refund for all bets"
              : "View all your current bets ranked by amount"}
          </p>
          <motion.div
            className="w-40 h-2 bg-gradient-to-r from-red-500 to-yellow-500 mx-auto rounded-full mt-6"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          ></motion.div>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {teamsLoading || userBetsLoading || winningTeamLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="glass-red p-6 border-red-500/20">
                  <CardContent className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 bg-red-900/50 rounded-full" />
                      <div>
                        <Skeleton className="h-6 w-32 bg-red-900/50 rounded-md mb-2" />
                        <Skeleton className="h-4 w-20 bg-red-900/50 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24 bg-red-900/50 rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userBets.length === 0 ? (
            <div className="space-y-8">
              <Card className="glass-red p-8 text-center border-red-500/20">
                <CardContent>
                  <p className="text-red-300 text-lg">
                    {status?.status === 2
                      ? "You didn't participate in this contest."
                      : status?.status === 3
                      ? "You didn't participate in this contest."
                      : "You haven't placed any bets yet."}
                  </p>
                  <p className="text-red-400 mt-2">
                    {status?.status === 2
                      ? "Better luck next time!"
                      : status?.status === 3
                      ? "Your refund is available below."
                      : "Place your first bet to see it appear here!"}
                  </p>
                </CardContent>
              </Card>

              {/* Show Withdraw Section even with no bets when contest ended */}
              {(status?.status === 2 || status?.status === 3) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="glass-red p-8 rounded-2xl max-w-md mx-auto">
                    <h3 className="text-2xl font-bold text-red-100 mb-4">
                      {status.status === 2
                        ? "🎉 Better Luck Next Time!"
                        : "💰 Get Your Refund!"}
                    </h3>
                    <p className="text-red-300 mb-6">
                      {status.status === 2
                        ? "Although you didn't win this time, you can still check the results."
                        : "Get your full refund even if you didn't place any bets."}
                    </p>
                    <Link href="/withdraw">
                      <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold px-8 py-3">
                        {status.status === 2 ? "View Results" : "Get Refund"}
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {userBets.map((bet, index) => (
                <motion.div
                  key={bet.teamId}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="glass-red p-6 border-red-500/20 hover:border-red-400/40 transition-all duration-300 hover:scale-105">
                    <CardContent className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <motion.img
                            src={
                              TEAM_LOGOS[bet.teamName] || "/teams/default.webp"
                            }
                            alt={bet.teamName}
                            className="w-10 h-10 object-contain"
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.1 + 0.2,
                            }}
                            onError={(e) => {
                              // Hide image if it fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                            onLoad={() => {
                              // Image loaded successfully
                            }}
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-xl font-bold text-red-100">
                                {bet.teamName}
                              </h3>
                              {teams &&
                                Array.isArray(teams) &&
                                winningTeamId !== undefined &&
                                winningTeamId !== null &&
                                teams.find(
                                  (team: Team) =>
                                    team.id === bet.teamId &&
                                    team.id === Number(winningTeamId)
                                ) && (
                                  <motion.div
                                    className="bg-yellow-400 text-gray-900 font-bold px-2 py-1 rounded-full text-xs"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                      type: "spring",
                                      damping: 10,
                                      stiffness: 150,
                                      delay: 0.5,
                                    }}
                                  >
                                    WINNER
                                  </motion.div>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-300">
                          {parseFloat(bet.amount).toFixed(4)} ETH
                        </p>
                        <p className="text-sm text-red-400">
                          ${Math.round(bet.amountEth * 3000).toLocaleString()}{" "}
                          USD
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Total Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: userBets.length * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass-red p-6 border-yellow-500/40 bg-gradient-to-r from-red-900/20 to-yellow-900/20">
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-yellow-300">
                        Total Bets
                      </h3>
                      <p className="text-red-400">{userBets.length} teams</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-yellow-300">
                        {parseFloat(
                          userBets
                            .reduce((sum, bet) => sum + bet.amountEth, 0)
                            .toFixed(4)
                        )}{" "}
                        ETH
                      </p>
                      <p className="text-sm text-red-400">
                        $
                        {Math.round(
                          userBets.reduce(
                            (sum, bet) => sum + bet.amountEth,
                            0
                          ) * 3000
                        ).toLocaleString()}{" "}
                        USD
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Withdraw Section - Show link to dedicated page when contest ended */}
              {(status?.status === 2 || status?.status === 3) &&
                userBets.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="mt-12 text-center"
                  >
                    <div className="glass-red p-8 rounded-2xl max-w-md mx-auto">
                      <h3 className="text-2xl font-bold text-red-100 mb-4">
                        {status.status === 2
                          ? "🎉 Claim Your Prize!"
                          : "💰 Get Your Refund!"}
                      </h3>
                      <p className="text-red-300 mb-6">
                        {status.status === 2
                          ? "Congratulations! Your winnings are ready to claim."
                          : "Get your full refund for all your bets."}
                      </p>
                      <Link href="/withdraw">
                        <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold px-8 py-3">
                          {status.status === 2 ? "Claim Prize" : "Get Refund"}
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
