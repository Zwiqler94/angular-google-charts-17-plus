import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  output,
  input,
  inject
} from '@angular/core';
import { ReplaySubject } from 'rxjs';

import { ScriptLoaderService } from '../../services/script-loader.service';
import { ChartErrorEvent, ChartReadyEvent, ChartSelectionChangedEvent } from '../../types/events';
import { ChartBase } from '../chart-base/chart-base.component';

@Component({
  selector: 'chart-wrapper',
  template: '',
  styles: [':host { width: fit-content; display: block; }'],
  host: { class: 'chart-wrapper' },
  exportAs: 'chartWrapper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ChartWrapperComponent implements ChartBase, OnChanges, OnInit {
  private element = inject(ElementRef);
  private scriptLoaderService = inject(ScriptLoaderService);

  /**
   * Either a JSON object defining the chart, or a serialized string version of that object.
   * The format of this object is shown in the
   * {@link https://developers.google.com/chart/interactive/docs/reference#google.visualization.drawchart `drawChart()`} documentation.
   *
   * The `container` and `containerId` will be overwritten by this component to allow
   * rendering the chart into the components' template.
   */
  public readonly specs = input<google.visualization.ChartSpecs>();

  public readonly error = output<ChartErrorEvent>();

  public readonly ready = output<ChartReadyEvent>();

  public readonly select = output<ChartSelectionChangedEvent>();

  private wrapper: google.visualization.ChartWrapper | undefined;
  private wrapperReadySubject = new ReplaySubject<google.visualization.ChartWrapper>(1);
  private initialized = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  public get chart(): google.visualization.ChartBase | null {
    return this.chartWrapper.getChart();
  }

  public get wrapperReady$() {
    return this.wrapperReadySubject.asObservable();
  }

  public get chartWrapper(): google.visualization.ChartWrapper {
    if (!this.wrapper) {
      throw new Error('Cannot access the chart wrapper before initialization.');
    }

    return this.wrapper;
  }

  public set chartWrapper(wrapper: google.visualization.ChartWrapper) {
    this.wrapper = wrapper;
    this.drawChart();
  }

  public ngOnInit() {
    // We don't need to load any chart packages, the chart wrapper will handle this else for us
    this.scriptLoaderService.loadChartPackages().subscribe(() => {
      const specsValue = this.specs() ?? ({} as google.visualization.ChartSpecs);

      const { containerId, container, ...specs } = specsValue;

      // Only ever create the wrapper once to allow animations to happen if something changes.
      this.wrapper = new google.visualization.ChartWrapper({
        ...specs,
        container: this.element.nativeElement
      });
      this.registerChartEvents();

      this.wrapperReadySubject.next(this.wrapper);

      this.drawChart();
      this.initialized = true;
    });
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (!this.initialized) {
      return;
    }

    if (changes['specs']) {
      this.updateChart();
      this.drawChart();
    }
  }

  private updateChart() {
    // When specs are undefined, we update with empty values instead of throwing.
    const specs = this.specs() ?? ({} as google.visualization.ChartSpecs);

    // The typing here are not correct. These methods accept `undefined` as well.
    // That's why we have to cast to `any`

    this.wrapper!.setChartType(specs.chartType);
    this.wrapper!.setDataTable(specs.dataTable as any);
    this.wrapper!.setDataSourceUrl(specs.dataSourceUrl as any);
    this.wrapper!.setDataSourceUrl(specs.dataSourceUrl as any);
    this.wrapper!.setQuery(specs.query as any);
    this.wrapper!.setOptions(specs.options as any);
    this.wrapper!.setRefreshInterval(specs.refreshInterval as any);
    this.wrapper!.setView(specs.view);
  }

  private drawChart() {
    if (this.wrapper) {
      this.wrapper.draw();
    }
  }

  private registerChartEvents() {
    google.visualization.events.removeAllListeners(this.wrapper);

    const registerChartEvent = (object: any, eventName: string, callback: Function) => {
      google.visualization.events.addListener(object, eventName, callback);
    };

    registerChartEvent(this.wrapper, 'ready', () => this.ready.emit({ chart: this.chart! }));
    registerChartEvent(this.wrapper, 'error', (error: ChartErrorEvent) => this.error.emit(error));
    registerChartEvent(this.wrapper, 'select', () => {
      const selection = this.chart!.getSelection();
      this.select.emit({ selection });
    });
  }
}
