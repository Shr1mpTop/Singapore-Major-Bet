'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import Image from 'next/image';

// Contract ABI for userBets function
const USER_BETS_ABI = [
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    name: "userBets",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
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
          { internalType: "uint256", name: "supporterCount", type: "uint256" }
        ],
        internalType: "struct CS2MajorBetting.Team[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Contract address
const CONTRACT_ADDRESS: `0x${string}` = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xb5c4bea741cea63b2151d719b2cca12e80e6c7e8') as `0x${string}`;

// Team name to logo mapping
const TEAM_LOGOS: Record<string, string> = {
  'Vitality': '/teams/team vitality.webp',
  'Tyloo': '/teams/tyloo.svg',
  'G2': '/teams/g2 esports.webp',
  'FaZe': '/teams/FaZe Clan.webp',
  'Spirit': '/teams/team spirit.webp',
  'Natus Vincere': '/teams/Natus Vincere.svg',
  'ENCE': '/teams/ence.svg',
  'Heroic': '/teams/heroic.webp'
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
}

export function ViewYourBetsSection() {
  const { address, isConnected } = useAccount();
  
  // Get all teams
  const { data: teams, isLoading: teamsLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: USER_BETS_ABI,
    functionName: 'getTeams',
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
        functionName: 'userBets' as const,
        args: [address as `0x${string}`, BigInt(team.id)]
      });
    }
  }

  // Use useReadContracts to get all user bets in a single call
  const { data: userBetResults, isLoading: userBetsLoading } = useReadContracts({
    contracts: userBetCalls,
    query: {
      enabled: !!address && isConnected && userBetCalls.length > 0,
    },
  });

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
          amountEth: parseFloat(formatEther(betAmount))
        });
      }
    }
    
    // Sort by amount (highest first)
    userBets.sort((a, b) => b.amountEth - a.amountEth);
  }

  if (!isConnected) {
    return (
      <motion.section
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
                <p className="text-red-300 text-lg">Please connect your wallet to see your bets.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
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
            View all your current bets ranked by amount
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
          {teamsLoading || userBetsLoading ? (
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
            <Card className="glass-red p-8 text-center border-red-500/20">
              <CardContent>
                <p className="text-red-300 text-lg">You haven't placed any bets yet.</p>
                <p className="text-red-400 mt-2">Place your first bet to see it appear here!</p>
              </CardContent>
            </Card>
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
                            src={TEAM_LOGOS[bet.teamName] || '/teams/default.webp'}
                            alt={bet.teamName}
                            className="w-10 h-10 object-contain"
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                            onError={(e) => {
                              // Hide image if it fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            onLoad={() => {
                              // Image loaded successfully
                            }}
                          />
                          <div>
                            <h3 className="text-xl font-bold text-red-100">{bet.teamName}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-300">
                          {parseFloat(bet.amount).toFixed(4)} ETH
                        </p>
                        <p className="text-sm text-red-400">
                          ${Math.round(bet.amountEth * 3000).toLocaleString()} USD
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
                      <h3 className="text-xl font-bold text-yellow-300">Total Bets</h3>
                      <p className="text-red-400">{userBets.length} teams</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-yellow-300">
                        {parseFloat(userBets.reduce((sum, bet) => sum + bet.amountEth, 0).toFixed(4))} ETH
                      </p>
                      <p className="text-sm text-red-400">
                        ${Math.round(userBets.reduce((sum, bet) => sum + bet.amountEth, 0) * 3000).toLocaleString()} USD
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}