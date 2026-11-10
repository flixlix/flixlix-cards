import {
  type EnergyCollectionFossilData,
  type EnergyPeriodWindow,
  fetchEnergyPeriodGrowth,
  fetchFossilEnergyConsumption,
  type FossilEnergyConsumption,
  getGlobalEnergyPeriodWindow,
  subscribeEnergyCollectionData,
  watchGlobalEnergyPeriodChanges,
} from "@flixlix-cards/shared/states/utils/energy-period";
import { type HomeAssistant } from "custom-card-helpers";
import { type ReactiveController, type ReactiveElement } from "lit";

/** What a card reads over the energy period, asked for again on every refresh. */
export type EnergyPeriodSource = {
  hass: HomeAssistant | undefined;
  /** The energy collection, i.e. the dashboard's date picker, to follow. */
  collectionKey: string | undefined;
  statisticIds: string[];
  /**
   * The low-carbon sensor and the grid import statistics its share is weighed by, fetched while
   * Home Assistant's collection does not carry the period's fossil consumption.
   */
  fossil?: { entity: string; gridImportIds: string[] };
};

/**
 * The selected energy period and each statistic's growth over it, refetched whenever the
 * dashboard's period changes; the card updates when they arrive.
 */
export class EnergyPeriodController implements ReactiveController {
  /** The selected period, or null without a date picker to follow. */
  public window: EnergyPeriodWindow | null = null;
  private _growthMap: Record<string, number> = {};
  private _loaded = false;
  private _collectionFossil: EnergyCollectionFossilData = {};
  private _fetchedFossil?: FossilEnergyConsumption;
  private _unsubPeriod?: () => void;
  private _unsubFossil?: () => void;
  private _subscribedKey?: string;
  private _queue: Promise<void> = Promise.resolve();
  private _generation = 0;
  private _refreshPending = false;

  /** `_source` returns null while the card reads nothing over a period, e.g. live power. */
  constructor(
    private readonly _host: ReactiveElement,
    private readonly _source: () => EnergyPeriodSource | null
  ) {
    _host.addController(this);
  }

  /** Each statistic's growth in Wh, or undefined until the first period has loaded. */
  get growthMap(): Record<string, number> | undefined {
    return this._loaded ? this._growthMap : undefined;
  }

  get fossilConsumption(): FossilEnergyConsumption | undefined {
    return this._collectionFossil.fossilEnergyConsumption ?? this._fetchedFossil;
  }

  hostConnected(): void {
    this.subscribe();
    void this.refresh();
  }

  hostDisconnected(): void {
    this._unsubscribe();
  }

  /**
   * Follows the period and the collection's fossil data once `hass` has a collection to follow,
   * and again for the new one after the collection key changes. Cheap to call on every update.
   */
  subscribe(): void {
    const source = this._source();
    if (!source) {
      this._unsubscribe();
      return;
    }
    const { hass, collectionKey } = source;
    if (collectionKey !== this._subscribedKey) {
      this._unsubscribe();
      this._subscribedKey = collectionKey;
    }
    if (!hass) {
      return;
    }
    if (!this._unsubPeriod) {
      const unsub = watchGlobalEnergyPeriodChanges(
        hass,
        () => this._scheduleRefresh(),
        collectionKey
      );
      if (unsub) {
        this._unsubPeriod = unsub;
        void this.refresh();
      }
    }
    this._unsubFossil ??=
      subscribeEnergyCollectionData(
        hass,
        (data) => {
          this._collectionFossil = data;
          this._host.requestUpdate();
        },
        collectionKey
      ) ?? undefined;
  }

  /** Loads the current period after any load in flight; of several queued, only the last runs. */
  refresh(): Promise<void> {
    const generation = ++this._generation;
    const load = () => (generation === this._generation ? this._load() : undefined);
    this._queue = this._queue.then(load, load);
    return this._queue;
  }

  private _scheduleRefresh(): void {
    if (this._refreshPending) {
      return;
    }
    this._refreshPending = true;
    queueMicrotask(() => {
      this._refreshPending = false;
      void this.refresh();
    });
  }

  private async _load(): Promise<void> {
    const source = this._source();
    if (!source?.hass) {
      return;
    }
    const { hass, collectionKey, statisticIds, fossil } = source;
    const window = getGlobalEnergyPeriodWindow(hass, collectionKey);
    const zeroGrowthMap = Object.fromEntries(statisticIds.map((id) => [id, 0]));
    this.window = window;
    this._host.requestUpdate();
    if (!window) {
      this._settle(zeroGrowthMap, undefined);
      return;
    }
    const [growth, fetchedFossil] = await Promise.allSettled([
      fetchEnergyPeriodGrowth(hass, statisticIds, window),
      fossil && !this._collectionFossil.fossilEnergyConsumption
        ? fetchFossilEnergyConsumption(hass, fossil.gridImportIds, fossil.entity, window)
        : undefined,
    ]);
    this._settle(
      growth.status === "fulfilled" ? { ...zeroGrowthMap, ...growth.value } : zeroGrowthMap,
      fetchedFossil.status === "fulfilled" ? fetchedFossil.value : undefined
    );
  }

  private _settle(growthMap: Record<string, number>, fossil: FossilEnergyConsumption | undefined) {
    this._growthMap = growthMap;
    this._fetchedFossil = fossil;
    this._loaded = true;
    this._host.requestUpdate();
  }

  private _unsubscribe(): void {
    this._unsubPeriod?.();
    this._unsubPeriod = undefined;
    this._unsubFossil?.();
    this._unsubFossil = undefined;
  }
}
