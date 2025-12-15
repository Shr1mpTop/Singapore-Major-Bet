import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5001/api";

// 合约地址
const CONTRACT_ADDRESS: `0x${string}` = (process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xb5c4bea741cea63b2151d719b2cca12e80e6c7e8") as `0x${string}`;

// 合约ABI - status函数
const STATUS_ABI = [
  {
    inputs: [],
    name: "status",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
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

export interface StatusData {
  status: number;
  status_text: string;
  total_prize_pool_wei: string;
  winning_team_id: number;
}

export interface TeamData {
  id: number;
  name: string;
  logo_url: string;
  prize_pool_eth: number;
  bets_count: number;
  is_winner: boolean;
}

export interface StatsData {
  total_unique_participants: number;
  total_bets: number;
  total_prize_pool_wei: string;
  total_prize_pool_eth: number;
  weapon_equivalents: {
    name: string;
    count: number;
    img: string;
    price_usd: number;
    progress: number;
    raw_count: number;
  }[];
}

export interface LeaderboardData {
  rank: number;
  address: string;
  total_bet_eth: number;
}

export function useStats() {
  return useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      return response.data;
    },
    refetchInterval: 5000,
  });
}

export function useStatus() {
  // 从合约获取状态
  const { data: contractStatus, isLoading: contractLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: STATUS_ABI,
    functionName: "status",
  });

  // 从合约获取获胜队伍ID
  const { data: contractWinningTeamId, isLoading: winningTeamLoading } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: STATUS_ABI,
      functionName: "winningTeamId",
    });

  // 从后端获取其他数据
  const { data: backendData, isLoading: backendLoading } = useQuery({
    queryKey: ["status"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/status`);
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // 合并数据：优先使用合约状态
  const statusData = backendData
    ? {
        ...backendData,
        status:
          contractStatus !== undefined
            ? Number(contractStatus)
            : backendData.status,
        status_text:
          contractStatus !== undefined
            ? ["Open", "Stopped", "Finished", "Refunding"][
                Number(contractStatus)
              ] || "Unknown"
            : backendData.status_text,
        winning_team_id:
          contractWinningTeamId !== undefined
            ? Number(contractWinningTeamId)
            : backendData.winning_team_id,
      }
    : null;

  // 调试信息
  // console.log(
  //   "Contract status:",
  //   contractStatus,
  //   "Backend status:",
  //   backendData?.status,
  //   "Final status:",
  //   statusData?.status
  // );

  return {
    data: statusData,
    isLoading: contractLoading || backendLoading || winningTeamLoading,
    refetch: () => {}, // 可以后续添加refetch逻辑
  };
}

export function useTeams() {
  return useQuery<TeamData[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/teams`);
      return response.data;
    },
    refetchInterval: 5000,
  });
}

export function useLeaderboard() {
  return useQuery<LeaderboardData[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/leaderboard`);
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export interface EthPriceData {
  symbol: string;
  price: string;
}

export function useEthPrice() {
  return useQuery<EthPriceData>({
    queryKey: ["ethPrice"],
    queryFn: async () => {
      try {
        // 尝试从币安API获取ETH/USDT汇率
        const response = await axios.get(
          "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
          {
            timeout: 5000, // 5秒超时
          }
        );
        console.log("✅ ETH价格获取成功（币安API）:", response.data);
        return response.data;
      } catch (binanceError) {
        console.warn("币安API不可用，尝试CoinGecko API:", binanceError);
        try {
          // 备用：使用CoinGecko API
          const coingeckoResponse = await axios.get(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
            {
              timeout: 5000, // 5秒超时
            }
          );
          const price = coingeckoResponse.data.ethereum.usd;
          console.log("ETH价格获取成功（CoinGecko API）:", price);
          return {
            symbol: "ETHUSD",
            price: price.toString(),
          };
        } catch (coingeckoError) {
          console.warn(
            "CoinGecko API也不可用，使用备用汇率3000:",
            coingeckoError
          );
          // 最后备用：固定汇率
          return {
            symbol: "ETHUSD",
            price: "3000",
          };
        }
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds for price data
    retry: 1, // 减少重试次数，因为我们有备用API
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数退避
  });
}
