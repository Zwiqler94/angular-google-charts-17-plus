import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  input,
  output,
  contentChildren,
  inject
} from '@angular/core';
import { combineLatest } from 'rxjs';

import { DataTableService } from '../../services/data-table.service';
import { ScriptLoaderService } from '../../services/script-loader.service';
import { ChartErrorEvent } from '../../types/events';
import { Formatter } from '../../types/formatter';
import { Column, Row } from '../chart-base/chart-base.component';
import { ControlWrapperComponent } from '../control-wrapper/control-wrapper.component';

@Component({
  selector: 'dashboard',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'dashboard',
  host: { class: 'dashboard' },
  standalone: true
})
export class DashboardComponent implements OnInit, OnChanges {
  private element = inject(ElementRef);
  private loaderService = inject(ScriptLoaderService);
  private dataTableService = inject(DataTableService);

  /**
   * Data used to initialize the table.
   *
   * This must also contain all roles that are set in the `columns` property.
   */
  public readonly data = input.required<Row[]>();

  /**
   * The columns the `data` consists of.
   * The length of this array must match the length of each row in the `data` object.
   *
   * If {@link https://developers.google.com/chart/interactive/docs/roles roles} should be applied, they must be included in this array as well.
   */
  public readonly columns = input<Column[]>();

  /**
   * Used to change the displayed value of the specified column in all rows.
   *
   * Each array element must consist of an instance of a [`formatter`](https://developers.google.com/chart/interactive/docs/reference#formatters)
   * and the index of the column you want the formatter to get applied to.
   */
  public readonly formatters = input<Formatter[]>();

  /**
   * The dashboard has completed drawing and is ready to accept changes.
   *
   * The ready event will also fire:
   * - after the completion of a dashboard refresh triggered by a user or programmatic interaction with one of the controls,
   * - after redrawing any chart on the dashboard.
   */
  public readonly ready = output<void>();

  /**
   * Emits when an error occurs when attempting to render the dashboard.
   * One or more of the controls and charts that are part of the dashboard may have failed rendering.
   */
  public readonly error = output<ChartErrorEvent>();

  private readonly controlWrappers = contentChildren(ControlWrapperComponent);

  private dashboard?: google.visualization.Dashboard;
  private dataTable?: google.visualization.DataTable;
  private initialized = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  public ngOnInit() {
    this.loaderService.loadChartPackages('controls').subscribe(() => {
      this.dataTable = this.dataTableService.create(this.data(), this.columns(), this.formatters());
      this.createDashboard();
      this.initialized = true;
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }

    if (changes['data'] || changes['columns'] || changes['formatters']) {
      this.dataTable = this.dataTableService.create(this.data(), this.columns(), this.formatters());
      this.dashboard!.draw(this.dataTable!);
    }
  }

  private createDashboard(): void {
    // TODO: This should happen in the control wrapper
    // However, I don't yet know how to do this because then `bind()` would get called multiple times
    // for the same control if something changes. This is not supported by google charts as far as I can tell
    // from their source code.
    const controlWrappersReady$ = this.controlWrappers().map(control => control.wrapperReady$);
    const chartsReady$ = this.controlWrappers()
      .map(control => control.for())
      .map(charts => {
        if (Array.isArray(charts)) {
          // CombineLatest waits for all observables
          return combineLatest(charts.map(chart => chart.wrapperReady$));
        } else {
          return charts.wrapperReady$;
        }
      });

    // We have to wait for all chart wrappers and control wrappers to be initialized
    // before we can compose them together to create the dashboard
    combineLatest([...controlWrappersReady$, ...chartsReady$]).subscribe(() => {
      this.dashboard = new google.visualization.Dashboard(this.element.nativeElement);
      this.initializeBindings();
      this.registerEvents();
      this.dashboard.draw(this.dataTable!);
    });
  }

  private registerEvents(): void {
    google.visualization.events.removeAllListeners(this.dashboard);

    const registerDashEvent = (object: any, eventName: string, callback: Function) => {
      google.visualization.events.addListener(object, eventName, callback);
    };

    registerDashEvent(this.dashboard, 'ready', () => this.ready.emit(void 0));
    registerDashEvent(this.dashboard, 'error', (error: ChartErrorEvent) => this.error.emit(error));
  }

  private initializeBindings(): void {
    this.controlWrappers().forEach(control => {
      const forControl = control.for();
      if (Array.isArray(forControl)) {
        const chartWrappers = forControl.map(chart => chart.chartWrapper);
        this.dashboard!.bind(control.controlWrapper, chartWrappers);
      } else {
        this.dashboard!.bind(control.controlWrapper, forControl.chartWrapper);
      }
    });
  }
}
