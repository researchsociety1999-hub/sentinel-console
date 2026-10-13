/**
 * Causal Graph Context Engine (G_01 – Relational Intelligence)
 * Map-based adjacency list. Edges weighted by Time Delta & Spatial Distance.
 * Injected into ContextEngine after base enrichment.
 */

import type { EventData, RelationalTag, CausalityChain } from "../contracts/types.js";

interface GraphNode {
  event_id: string;
  sensor_id: string;
  location_tag: string;
  timestamp: number;
  metrics: Record<string, number>;
}

interface GraphEdge {
  to: string;
  relation_type: RelationalTag["relation_type"];
  weight: number;
  time_delta_ms: number;
}

export class CausalGraph {
  private nodes = new Map<string, GraphNode>();
  private adj = new Map<string, GraphEdge[]>();
  private recentCritical: string[] = []; // newest first
  private readonly MAX_NODES = 500;
  private readonly TEMPORAL_WINDOW_MS = 30_000;

  addEvent(event: EventData): void {
    const node: GraphNode = {
      event_id: event.event_id,
      sensor_id: event.sensor_id,
      location_tag: event.location_tag,
      timestamp: event.timestamp,
      metrics: event.metrics,
    };

    this.nodes.set(event.event_id, node);
    this.adj.set(event.event_id, []);

    // Create edges to recent events within temporal window
    for (const [id, other] of this.nodes) {
      if (id === event.event_id) continue;
      const delta = Math.abs(event.timestamp - other.timestamp);
      if (delta > this.TEMPORAL_WINDOW_MS) continue;

      const spatial = event.location_tag === other.location_tag ? 0 : 1;
      const weight = Math.max(0, 1 - delta / this.TEMPORAL_WINDOW_MS) * (spatial === 0 ? 1 : 0.4);

      if (weight < 0.15) continue;

      const edge: GraphEdge = {
        to: id,
        relation_type: spatial === 0 ? "temporal" : "spatial",
        weight,
        time_delta_ms: delta,
      };
      this.adj.get(event.event_id)!.push(edge);

      // bidirectional for undirected query convenience
      this.adj.get(id)?.push({
        to: event.event_id,
        relation_type: edge.relation_type,
        weight,
        time_delta_ms: delta,
      });
    }

    // Track critical-looking events (any metric > 0.8 of typical scale)
    const isCritical = Object.values(event.metrics).some((v) => v > 70);
    if (isCritical) {
      this.recentCritical.unshift(event.event_id);
      if (this.recentCritical.length > 20) this.recentCritical.pop();
    }

    this.prune();
  }

  /** Shortest-path style query to nearest recent critical event */
  queryGraph(eventId: string): { tags: RelationalTag[]; chain: CausalityChain | null } {
    const tags: RelationalTag[] = [];
    const edges = this.adj.get(eventId) ?? [];

    for (const e of edges) {
      tags.push({
        related_event_id: e.to,
        relation_type: e.relation_type,
        weight: e.weight,
        time_delta_ms: e.time_delta_ms,
      });
    }

    // Build simple causality chain to most recent critical
    let chain: CausalityChain | null = null;
    if (this.recentCritical.length > 0) {
      const target = this.recentCritical[0];
      if (target !== eventId) {
        chain = {
          nodes: [eventId, target],
          edges: tags.filter((t) => t.related_event_id === target),
          summary: `Linked to recent critical event ${target} via temporal/spatial proximity.`,
        };
      }
    }

    return { tags, chain };
  }

  private prune(): void {
    if (this.nodes.size <= this.MAX_NODES) return;
    const sorted = [...this.nodes.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.slice(0, this.nodes.size - this.MAX_NODES);
    for (const [id] of toRemove) {
      this.nodes.delete(id);
      this.adj.delete(id);
      // clean reverse edges (simple)
      for (const list of this.adj.values()) {
        const idx = list.findIndex((e) => e.to === id);
        if (idx >= 0) list.splice(idx, 1);
      }
    }
  }
}
