import { supabase } from "../lib/supabase";

export type MemberRow = {
  card_id: string;
  customer_id: string;
  reward_type: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  joined_at: string;
};

export type PointTransactionRow = {
  id: string;
  card_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  actor_id: string | null;
  actor_role: string | null;
  client_id: string;
  reason: string | null;
  idempotency_key: string | null;
  coupon_issuance_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

export type CouponPrepareRow = {
  coupon_id: string;
  coupon_name: string;
  coupon_type: string;
  bonus_points: number | null;
  bonus_stamps: number | null;
  valid_until: string | null;
  status: string;
  eligible_member_count: number;
};

function createIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchMembers(params: {
  clientId: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<MemberRow[]> {
  const { data, error } = await supabase.rpc("client_list_members_v1", {
    p_client_id: params.clientId,
    p_search: params.search || null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  });

  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

export async function awardPoints(params: {
  clientId: string;
  customerId: string;
  amount: number;
  reason?: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("client_award_points_v1", {
    p_client_id: params.clientId,
    p_customer_id: params.customerId,
    p_amount: params.amount,
    p_reason: params.reason || null,
    p_idempotency_key: createIdempotencyKey(),
  });

  if (error) throw error;
  return Number(data);
}

export async function adjustPoints(params: {
  clientId: string;
  customerId: string;
  amount: number;
  reason: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("client_adjust_points_v1", {
    p_client_id: params.clientId,
    p_customer_id: params.customerId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_idempotency_key: createIdempotencyKey(),
  });

  if (error) throw error;
  return Number(data);
}

export async function fetchPointHistory(params: {
  clientId: string;
  customerId: string;
  limit?: number;
  offset?: number;
}): Promise<PointTransactionRow[]> {
  const { data, error } = await supabase.rpc(
    "client_list_point_transactions_v1",
    {
      p_client_id: params.clientId,
      p_customer_id: params.customerId,
      p_limit: params.limit ?? 30,
      p_offset: params.offset ?? 0,
    }
  );

  if (error) throw error;
  return (data ?? []) as PointTransactionRow[];
}

export async function fetchCouponIssuePreview(params: {
  clientId: string;
  search?: string;
}): Promise<CouponPrepareRow[]> {
  const { data, error } = await supabase.rpc(
    "client_prepare_coupon_issue_v1",
    {
      p_client_id: params.clientId,
      p_search: params.search || null,
    }
  );

  if (error) throw error;
  return (data ?? []) as CouponPrepareRow[];
}