import { EventEmitter, OutputEmitterRef } from '@angular/core';
import { Observable } from 'rxjs';

import { ChartErrorEvent, ChartReadyEvent, ChartSelectionChangedEvent } from '../../types/events';

export type Column = string | google.visualization.ColumnSpec;
export type Row = (string | number | Date | null)[];
type ChartOutput<T> = EventEmitter<T> | OutputEmitterRef<T>;

export interface ChartBase {
  /**
   * The chart is ready for external method calls.
   *
   * Emits *after* the chart was drawn for the first time every time the chart gets redrawn.
   */
  ready: ChartOutput<ChartReadyEvent>;

  /**
   * Emits when an error occurs when attempting to render the chart.
   */
  error: ChartOutput<ChartErrorEvent>;

  /**
   * Emits when the user clicks a bar or legend.
   *
   * When a chart element is selected, the corresponding cell
   * in the data table is selected; when a legend is selected,
   * the corresponding column in the data table is selected.
   */
  select: ChartOutput<ChartSelectionChangedEvent>;

  /**
   * The drawn chart or `null`.
   */
  chart: google.visualization.ChartBase | null;

  /**
   * The underlying chart wrapper.
   *
   * This will throw an exception when trying to access the chart wrapper before `wrapperReady$` emits.
   */
  chartWrapper: google.visualization.ChartWrapper;

  /**
   * Emits after the `ChartWrapper` is created, but before the chart is drawn for the first time.
   */
  wrapperReady$: Observable<google.visualization.ChartWrapper>;
}
