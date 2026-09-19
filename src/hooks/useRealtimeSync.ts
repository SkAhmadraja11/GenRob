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
    // Only subscribe when shopId is a valid non-empty string
    if (!shopId || shopId === 'undefined' || typeof shopId !== 'string' || shopId.trim().length < 5) {
      setIsRealtimeActive(false);
      return;
    }

    // Create Supabase Realtime channel for the shop
    let channel: any = null;
    try {
      channel = supabase
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
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            setIsRealtimeActive(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsRealtimeActive(false);
            if (err) {
              console.debug('Realtime sync status:', status, err.message || '');
            }
          }
        });
    } catch (err) {
      console.debug('Realtime channel creation notice:', err);
      setIsRealtimeActive(false);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // Non-fatal teardown
        }
      }
    };
  }, [shopId, onProductsUpdate, onTransactionsUpdate, onAlertsUpdate, onKhataUpdate]);

  return { isRealtimeActive, lastEvent };
}
