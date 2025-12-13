'use client';

import { useStatus, useTeams, useStats, useEthPrice } from "@/hooks/useBackendData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatedNumber, SlotMachineNumber } from "@/components/AnimatedNumber";

// Contract ABI - bet function
const BET_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_teamId", type: "uint256" }],
    name: "bet",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
] as const;

// Contract address
const CONTRACT_ADDRESS: `0x${string}` = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xb5c4bea741cea63b2151d719b2cca12e80e6c7e8') as `0x${string}`;

function HeroSection({ onScrollToBetting }: { onScrollToBetting: () => void }) {
  const [windowSize, setWindowSize] = useState({ width: 1920, height: 1080 });
  const [particles, setParticles] = useState<Array<{x: number, y: number, delay: number, duration: number}>>([]);

  useEffect(() => {
    // Only run on client side
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });

    // Generate particles data only once on client side
    const particleData = [...Array(20)].map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2
    }));
    setParticles(particleData);
  }, []);

  return (
    <motion.section
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Hero section specific overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-red-900/10"></div>

      <div className="text-center max-w-4xl relative z-10">
        <motion.h1
          className="text-6xl md:text-8xl lg:text-9xl font-black tracking-wider leading-tight mb-6 relative overflow-hidden"
          initial={{ opacity: 0, y: -100, rotateX: -90 }}
          animate={{
            opacity: 1,
            y: 0,
            rotateX: 0
          }}
          transition={{
            type: "spring",
            damping: 12,
            stiffness: 100,
            duration: 1.2,
            delay: 0.3
          }}
        >
          <motion.span
            className="inline-block bg-gradient-to-r from-red-400 via-red-300 to-yellow-400 bg-clip-text text-transparent text-glow"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              backgroundSize: "200% 200%",
            }}
          >
            CS2 Singapore Major 2026
          </motion.span>
          {/* Knife edge flash animation */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 0.8,
              delay: 1.5,
              ease: "easeInOut"
            }}
            style={{
              mixBlendMode: "overlay",
              opacity: 0.8
            }}
          />
        </motion.h1>
        <motion.p
          className="text-xl md:text-2xl mb-8 text-red-100"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Champion Prediction Contest - Predict the winner, win prizes
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", damping: 10, stiffness: 400 }}
          >
            <Button
              size="lg"
              className="relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-10 py-5 text-lg glow-hover border border-red-400/50 rounded-xl overflow-hidden group shadow-2xl shadow-red-500/25"
              onClick={onScrollToBetting}
            >
              {/* Animated background gradient */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/20 to-yellow-400/0"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />

              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                initial={{ x: "-150%" }}
                animate={{
                  x: ["150%", "-150%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2
                }}
              />

              <span className="relative z-10 flex items-center space-x-2">
                <span>Start Betting</span>
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  →
                </motion.span>
              </span>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}

function StatsSection({ stats, status, statsLoading, statusLoading }: {
  stats: any;
  status: any;
  statsLoading: boolean;
  statusLoading: boolean;
}) {
  const totalParticipants = stats?.total_unique_participants || 0;
  const totalPrizePoolEth = status?.total_prize_pool_wei ? parseFloat(status.total_prize_pool_wei) / 10**18 : 0;
  const { data: ethPrice, isLoading: ethPriceLoading } = useEthPrice();
  const ethPriceValue = ethPrice ? parseFloat(ethPrice.price) : 0;
  const totalPrizePoolUsd = totalPrizePoolEth * ethPriceValue;

  return (
    <motion.section
      className="py-24 px-4 relative z-10 overflow-hidden"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      {/* Stats section overlay - very subtle for natural flow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/3 to-transparent"></div>

      <div className="max-w-7xl mx-auto relative">
        {/* Hero Title */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <motion.h2
            className="text-7xl md:text-9xl lg:text-10xl font-black mb-6 bg-gradient-to-r from-red-400 via-red-300 to-yellow-400 bg-clip-text text-transparent text-glow tracking-wider"
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            LIVE STATS
          </motion.h2>
          <motion.div
            className="w-40 h-2 bg-gradient-to-r from-red-500 to-yellow-500 mx-auto rounded-full"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          ></motion.div>
        </motion.div>

        {/* Stats Grid - Single column vertical layout */}
        <div className="grid grid-cols-1 gap-6 lg:gap-8 max-w-2xl mx-auto">
          {/* Total Prize Pool */}
          <motion.div
            className="group relative"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <div className="relative glass-red rounded-3xl p-6 lg:p-8 text-center transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-red-500/30 h-full border border-red-500/20 group-hover:border-red-400/40 backdrop-blur-xl">
              {/* Enhanced neumorphism shadow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/10 via-transparent to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>

              {/* Animated border glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-red-500/0 via-red-400/20 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>

              <div className="relative z-10 flex flex-col justify-center h-full">
                <motion.div
                  className="text-red-300 text-base lg:text-lg font-semibold mb-4 uppercase tracking-wider"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  viewport={{ once: true }}
                >
                  Total Prize Pool
                </motion.div>
                <div className="space-y-3">
                  {statusLoading ? (
                    <Skeleton className="h-10 w-28 bg-red-900/50 mx-auto rounded-lg" />
                  ) : (
                    <>
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        viewport={{ once: true }}
                      >
                        <p className="text-3xl lg:text-4xl font-black text-red-100 mb-1 drop-shadow-lg">
                          <SlotMachineNumber value={totalPrizePoolEth} duration={5} />
                          <span className="text-xl lg:text-2xl ml-1 text-red-300">ETH</span>
                        </p>
                      </motion.div>
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.9 }}
                        viewport={{ once: true }}
                      >
                        {ethPriceLoading ? (
                          <Skeleton className="h-6 w-20 bg-red-900/50 mx-auto rounded-lg" />
                        ) : (
                          <p className="text-xl lg:text-2xl font-bold text-yellow-300 drop-shadow-md">
                            $<SlotMachineNumber value={totalPrizePoolUsd} duration={5} decimals={2} />
                          </p>
                        )}
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Participants */}
          <motion.div
            className="group relative"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="relative glass-red rounded-3xl p-6 lg:p-8 text-center transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-red-500/30 h-full border border-red-500/20 group-hover:border-red-400/40 backdrop-blur-xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/10 via-transparent to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-red-500/0 via-red-400/20 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>

              <div className="relative z-10 flex flex-col justify-center h-full">
                <motion.div
                  className="text-red-300 text-base lg:text-lg font-semibold mb-4 uppercase tracking-wider"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  Participants
                </motion.div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-10 w-20 bg-red-900/50 mx-auto rounded-lg" />
                  ) : (
                    <motion.p
                      className="text-3xl lg:text-4xl font-black text-red-100 drop-shadow-lg"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      viewport={{ once: true }}
                    >
                      <AnimatedNumber value={totalParticipants} duration={0.8} />
                    </motion.p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Game Status */}
          <motion.div
            className="group relative"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="relative glass-red rounded-3xl p-6 lg:p-8 text-center transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-red-500/30 h-full border border-red-500/20 group-hover:border-red-400/40 backdrop-blur-xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/10 via-transparent to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-red-500/0 via-red-400/20 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>

              <div className="relative z-10 flex flex-col justify-center h-full">
                <motion.div
                  className="text-red-300 text-base lg:text-lg font-semibold mb-4 uppercase tracking-wider"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  viewport={{ once: true }}
                >
                  Game Status
                </motion.div>
                <div className="flex flex-col items-center space-y-3">
                  {statusLoading ? (
                    <Skeleton className="h-10 w-24 bg-red-900/50 mx-auto rounded-lg" />
                  ) : (
                    <>
                      <motion.p
                        className="text-2xl lg:text-3xl font-black text-red-100 uppercase tracking-wide drop-shadow-lg"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.9 }}
                        viewport={{ once: true }}
                      >
                        {status?.status_text}
                      </motion.p>
                      {/* Status indicator */}
                      <motion.div
                        className="flex items-center space-x-2"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.1 }}
                        viewport={{ once: true }}
                      >
                        <motion.div
                          className={`w-3 h-3 rounded-full ${
                            status?.status_text?.toLowerCase() === 'open'
                              ? 'bg-green-400 shadow-lg shadow-green-400/50'
                              : 'bg-yellow-400 shadow-lg shadow-yellow-400/50'
                          }`}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.7, 1]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <span className={`text-sm font-medium ${
                          status?.status_text?.toLowerCase() === 'open'
                            ? 'text-green-300'
                            : 'text-yellow-300'
                        }`}>
                          {status?.status_text?.toLowerCase() === 'open' ? 'Active' : 'Pending'}
                        </span>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ETH/USD Live Price */}
          <motion.div
            className="group relative"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="relative glass-red rounded-3xl p-6 lg:p-8 text-center transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-red-500/30 h-full border border-red-500/20 group-hover:border-red-400/40 backdrop-blur-xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/10 via-transparent to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-red-500/0 via-red-400/20 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>

              <div className="relative z-10 flex flex-col justify-center h-full">
                <motion.div
                  className="text-red-300 text-base lg:text-lg font-semibold mb-4 uppercase tracking-wider"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  viewport={{ once: true }}
                >
                  ETH/USD Live Price
                </motion.div>
                <div className="space-y-2">
                  {ethPriceLoading ? (
                    <Skeleton className="h-10 w-28 bg-red-900/50 mx-auto rounded-lg" />
                  ) : (
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 1.0 }}
                      viewport={{ once: true }}
                    >
                      <p className="text-3xl lg:text-4xl font-black text-yellow-300 drop-shadow-lg">
                        $<AnimatedNumber value={ethPriceValue} duration={1} />
                      </p>
                    </motion.div>
                  )}
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.2 }}
                    viewport={{ once: true }}
                  >
                    <div className="text-xs lg:text-sm text-red-400 font-medium bg-red-900/20 px-3 py-1 rounded-full inline-block">
                      📊 Data Source: Binance
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function BettingSection({ teams, status, teamsLoading }: {
  teams: any[];
  status: any;
  teamsLoading: boolean;
}) {
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess && address && selectedTeam !== null && selectedTeam !== undefined) {
      // Record user bet to backend database (event listeners will automatically sync on-chain data)
      const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5001/api';
      fetch(`${API_BASE_URL}/record_bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          teamId: selectedTeam,
          amount: (parseEther(betAmount)).toString(),  // Wei string
        }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Record successful, close dialog
        setIsOpen(false);
        setBetAmount('');
        setSelectedTeam(null);
        reset();
      })
      
      // Close dialog
      setIsOpen(false);
      setBetAmount('');
      setSelectedTeam(null);
      reset();
    }
  }, [isSuccess, address, selectedTeam, betAmount, queryClient, reset]);

  const calculateOdds = () => {
    const userAmount = parseFloat(betAmount) || 0;
    const selectedTeamData = teams.find(t => t.id === selectedTeam);
    if (!selectedTeamData) return 0;
    
    const teamPool = parseFloat(selectedTeamData.total_bet_wei) / 10**18;
    const totalPoolAmount = parseFloat(status?.total_prize_pool_wei || '0') / 10**18;
    const finalPool = totalPoolAmount * 0.9;
    if (teamPool === 0) return 0;
    return (userAmount / teamPool) * finalPool;
  };

  const handleBet = async () => {
    if (!betAmount || isNaN(parseFloat(betAmount)) || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount (greater than 0)');
      return;
    }

    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (selectedTeam === null || selectedTeam === undefined) {
      alert('Please select a team');
      return;
    }

    const amountInWei = parseEther(betAmount);

    // Check if on correct network
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0xaa36a7') { // Sepolia chain ID in hex
          alert('Please switch to Sepolia testnet');
          return;
        }
      } catch (chainError) {
        console.error('Error checking chain:', chainError);
      }
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: BET_ABI,
        functionName: 'bet',
        args: [BigInt(selectedTeam)],
        value: amountInWei,
        gas: BigInt(200000), // Increase gas limit
      });
    } catch (err) {
      console.error('writeContract error:', err);
      alert(`Contract call failed: ${err instanceof Error ? err.message : 'Unknown error'}\nPlease check console for more details`);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && !isSuccess) {
      // Reset state on close, if not successful close
      setBetAmount('');
      setSelectedTeam(null);
      reset();
    }
  };

  return (
    <motion.section
      className="min-h-screen py-16 px-4 relative z-10"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1 }}
      viewport={{ once: true }}
    >
      {/* Betting section overlay - very subtle for natural flow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-900/3 to-transparent"></div>

      <div className="max-w-6xl mx-auto relative">
        <motion.h2
          className="text-3xl font-bold text-center mb-12 text-glow"
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Select Team to Bet
        </motion.h2>

        {!isConnected ? (
          <motion.div
            className="text-center glass-red rounded-xl p-8 glow"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-xl mb-4 text-red-100">Please connect your wallet first</h3>
            <ConnectButton />
          </motion.div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {teamsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <Skeleton className="h-6 w-20" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-16 mb-2" />
                        <Skeleton className="h-4 w-12" />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                teams?.map((team, index) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card className="glass-red glow-hover border-red-400/30 transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="text-red-300">{team.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-red-200">Total Bets: {(parseFloat(team.total_bet_wei) / 10**18).toFixed(6)} ETH</p>
                        <p className="text-sm text-red-200">Supporters: {team.supporters}</p>

                        <Dialog open={isOpen && selectedTeam === team.id} onOpenChange={(open) => {
                          if (open) {
                            setSelectedTeam(team.id);
                          }
                          handleOpenChange(open);
                        }}>
                          <DialogTrigger asChild>
                            <Button className="w-full mt-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white glow-hover">
                              Bet
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-red border-red-400/30 text-white">
                            <DialogHeader>
                              <DialogTitle className="text-red-300">Bet on {team.name}</DialogTitle>
                              <DialogDescription className="text-red-200">
                                Please enter your bet amount and confirm the transaction. Team ID: {team.id}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm mb-2 text-white">Bet Amount (ETH)</label>
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
                                  <p className="text-sm text-red-100">Expected Payout: {calculateOdds().toFixed(6)} ETH</p>
                                </div>
                              )}
                              {error && (
                                <div className="p-4 bg-red-900/50 rounded border border-red-500/50">
                                  <p className="text-sm text-red-300">Error: {error.message}</p>
                                </div>
                              )}
                              {isSuccess && (
                                <div className="p-4 bg-green-900/30 rounded border border-green-400/50">
                                  <p className="text-sm text-green-300">✅ Transaction Successful!</p>
                                  <p className="text-xs text-green-400 break-all">Transaction Hash: {hash}</p>
                                </div>
                              )}
                              <Button
                                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold glow-hover border border-red-400/50"
                                onClick={handleBet}
                                disabled={isPending || isConfirming || !betAmount || parseFloat(betAmount) <= 0}
                              >
                                {isPending ? 'Confirm in wallet...' : isConfirming ? 'Processing transaction...' : `Confirm bet ${betAmount || '0'} ETH`}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}

export default function Home() {
  const [currentSection, setCurrentSection] = useState(0);
  const { scrollY } = useScroll();
  const { data: status, isLoading: statusLoading } = useStatus();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: stats, isLoading: statsLoading } = useStats();

  // 监听滚动位置来切换页面状态
  useEffect(() => {
    const unsubscribe = scrollY.onChange((value) => {
      const sectionHeight = window.innerHeight;
      const newSection = Math.floor(value / sectionHeight);
      setCurrentSection(Math.min(newSection, 2)); // 最多3个section
    });

    return unsubscribe;
  }, [scrollY]);

  const scrollToBetting = () => {
    const bettingSection = document.getElementById('betting-section');
    bettingSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-red-gradient text-white relative overflow-x-hidden">
      {/* 背景图片 */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: "url('/bg.png')",
        }}
      />

      {/* 背景装饰效果 */}
      <div className="fixed inset-0 bg-black-glass" />

      {/* 全局背景层 - 贯穿整个页面 */}
      <div className="fixed inset-0 z-0">
        {/* 渐变背景 - 从上到下，从暗到亮 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-red-900/40 to-transparent"></div>

        {/* 动态光球效果 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-yellow-500/6 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-red-500/3 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-red-500/5 to-transparent rounded-full blur-3xl"></div>

        {/* 几何形状装饰 */}
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 border border-red-500/20 rounded-full"
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-24 h-24 border border-yellow-500/20 rounded-lg rotate-45"
          animate={{
            rotate: [45, 135, 45],
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 15, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }
          }}
        />

        {/* 浮动光点 */}
        <motion.div
          className="absolute top-1/3 right-1/4 w-4 h-4 bg-red-400/30 rounded-full blur-sm"
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        <motion.div
          className="absolute bottom-1/3 left-1/4 w-6 h-6 bg-yellow-400/20 rounded-full blur-sm"
          animate={{
            y: [0, 20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5
          }}
        />
      </div>

      {/* 固定右上角钱包连接 */}
      <motion.div
        className="fixed top-4 right-4 z-50"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        <ConnectButton />
      </motion.div>

      {/* 页面内容 */}
      <div className="relative z-10">
        <HeroSection onScrollToBetting={scrollToBetting} />
        <StatsSection
          stats={stats}
          status={status}
          statsLoading={statsLoading}
          statusLoading={statusLoading}
        />
        <div id="betting-section">
          <BettingSection
            teams={teams || []}
            status={status}
            teamsLoading={teamsLoading}
          />
        </div>
      </div>

      {/* 页面指示器 */}
      <motion.div
        className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
      >
        <div className="flex flex-col space-y-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ${
                currentSection === index ? 'bg-red-400 glow' : 'bg-red-600/50'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const sections = ['hero-section', 'stats-section', 'betting-section'];
                const element = document.getElementById(sections[index]);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
