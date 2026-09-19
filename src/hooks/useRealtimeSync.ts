// Supabase Realtime Channel Subscription Hook - Live Stock & Alerts without polling

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UseRealtimeSyncProps {
  shopId?: string;
  onProductsUpdate?: () => void;
  onTransactionsUpdate?: () => void;
  onAlertsUpdate?: () => void;
  onKhataUpdate?: () => void;
}

export function useRealtimeSync({
  shopId,
  onProductsUpdate,
  onTransactionsUpdate,
  onAlertsUpdate,
  onKhataUpdate,
}: UseRealtimeSyncProps) {
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  useEffect(() => {
    // Create Supabase Realtime channel for the shop
    const channel = supabase
      .channel(`shop-realtime-${shopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          setLastEvent(`Product updated: ${payload.eventType}`);
          if (onProductsUpdate) onProductsUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          setLastEvent(`New stock transaction: ${payload.eventType}`);
          if (onTransactionsUpdate) onTransactionsUpdate();
          if (onProductsUpdate) onProductsUpdate(); // Running balance trigger also updated product
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          setLastEvent(`Alert triggered: ${payload.eventType}`);
          if (onAlertsUpdate) onAlertsUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'khata_ledger', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          setLastEvent(`Khata entry recorded: ${payload.eventType}`);
          if (onKhataUpdate) onKhataUpdate();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeActive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, onProductsUpdate, onTransactionsUpdate, onAlertsUpdate, onKhataUpdate]);

  return { isRealtimeActive, lastEvent };
}
