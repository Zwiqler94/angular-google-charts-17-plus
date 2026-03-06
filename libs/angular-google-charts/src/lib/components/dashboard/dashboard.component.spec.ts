import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of, Subject } from 'rxjs';

import { DataTableService } from '../../services/data-table.service';
import { ScriptLoaderService } from '../../services/script-loader.service';

import { DashboardComponent } from './dashboard.component';

jest.mock('../../services/script-loader.service');

const visualizationMock = {
  Dashboard: jest.fn(),
  arrayToDataTable: jest.fn(),
  events: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn()
  }
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [ScriptLoaderService, DataTableService]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    setInput('data', []);
    // No change detection here, we want to invoke the
    // lifecycle methods in the unit tests
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load the controls package', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(EMPTY);

      component.ngOnInit();

      expect(scriptLoaderService.loadChartPackages).toHaveBeenCalledWith('controls');
    });

    it('should create the data table', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      globalThis.google = { visualization: visualizationMock } as any;

      const columns = ['test', 'test2'];
      setInput('columns', columns);

      const data = [
        ['row 1', 10],
        ['row 2', 12]
      ];
      setInput('data', data);

      (component as any)['controlWrappers'] = () => [];

      component.ngOnInit();

      expect(visualizationMock.arrayToDataTable).toHaveBeenCalledWith([columns, ...data], false);
    });

    it('should create the data table without columns if none are provided', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      globalThis.google = { visualization: visualizationMock } as any;
      const data = [
        ['row 1', 10],
        ['row 2', 12]
      ];
      setInput('data', data);

      (component as any)['controlWrappers'] = () => [];

      component.ngOnInit();

      expect(visualizationMock.arrayToDataTable).toHaveBeenCalledWith(data, true);
    });

    it('should wait for all controls and their charts until creating the dashboard', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      const dashboardMock = { bind: jest.fn(), draw: jest.fn() };
      visualizationMock.Dashboard.mockReturnValueOnce(dashboardMock);

      globalThis.google = { visualization: visualizationMock } as any;

      const chartOne = { wrapperReady$: new Subject<void>() };
      const chartTwo = { wrapperReady$: new Subject<void>() };
      const controlOne = { wrapperReady$: new Subject<void>(), for: () => chartOne };
      const controlTwo = { wrapperReady$: new Subject<void>(), for: () => [chartOne, chartTwo] };

      (component as any)['controlWrappers'] = () => [controlOne, controlTwo];

      component.ngOnInit();

      expect(visualizationMock.Dashboard).not.toHaveBeenCalled();

      controlOne.wrapperReady$.next(void 0);
      controlTwo.wrapperReady$.next(void 0);
      expect(visualizationMock.Dashboard).not.toHaveBeenCalled();

      chartOne.wrapperReady$.next(void 0);
      expect(visualizationMock.Dashboard).not.toHaveBeenCalled();
      chartTwo.wrapperReady$.next(void 0);

      expect(visualizationMock.Dashboard).toHaveBeenCalled();
    });

    it('should bind all controls and dashboards', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      const dashboardMock = { bind: jest.fn(), draw: jest.fn() };
      visualizationMock.Dashboard.mockReturnValueOnce(dashboardMock);

      globalThis.google = { visualization: visualizationMock } as any;

      const chartOne = { wrapperReady$: of(null), chartWrapper: {} };
      const chartTwo = { wrapperReady$: of(null), chartWrapper: {} };
      const controlOne = { wrapperReady$: of(null), for: () => chartOne, controlWrapper: {} };
      const controlTwo = { wrapperReady$: of(null), for: () => [chartOne, chartTwo], controlWrapper: {} };

      (component as any)['controlWrappers'] = () => [controlOne, controlTwo];

      component.ngOnInit();

      expect(dashboardMock.bind).toHaveBeenCalledWith(controlOne.controlWrapper, chartOne.chartWrapper);
      expect(dashboardMock.bind).toHaveBeenCalledWith(controlTwo.controlWrapper, [
        chartOne.chartWrapper,
        chartTwo.chartWrapper
      ]);
    });

    it('should register dashboard wrapper event handlers', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      const dashboardMock = { bind: jest.fn(), draw: jest.fn() };
      visualizationMock.Dashboard.mockReturnValueOnce(dashboardMock);

      const dataTableMock = {};
      visualizationMock.arrayToDataTable.mockReturnValueOnce(dataTableMock);

      globalThis.google = { visualization: visualizationMock } as any;

      // At least one control wrapper is needed to start the drawing
      const chart = { wrapperReady$: of(null), chartWrapper: {} };
      const control = { wrapperReady$: of(null), for: () => chart, controlWrapper: {} };
      (component as any)['controlWrappers'] = () => [control];

      setInput('data', []);

      component.ngOnInit();

      expect(visualizationMock.events.removeAllListeners).toHaveBeenCalled();
      expect(visualizationMock.events.addListener).toHaveBeenCalledWith(dashboardMock, 'ready', expect.any(Function));
      expect(visualizationMock.events.addListener).toHaveBeenCalledWith(dashboardMock, 'error', expect.any(Function));
    });

    it('should apply the provided formatters', () => {
      const service = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      service.loadChartPackages.mockReturnValueOnce(of(null));

      const formatter = { formatter: { format: jest.fn() }, colIndex: 1 };
      setInput('formatters', [formatter]);
      setInput('data', []);

      const dataTableMock = {};
      visualizationMock.arrayToDataTable.mockReturnValueOnce(dataTableMock);

      component.ngOnInit();

      expect(formatter.formatter.format).toHaveBeenCalledWith(dataTableMock, formatter.colIndex);
    });

    it('should draw the dashboard using the provided data', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      const dashboardMock = { bind: jest.fn(), draw: jest.fn() };
      visualizationMock.Dashboard.mockReturnValueOnce(dashboardMock);

      const dataTableMock = {};
      visualizationMock.arrayToDataTable.mockReturnValueOnce(dataTableMock);

      globalThis.google = { visualization: visualizationMock } as any;

      // At least one control wrapper is needed to start the drawing
      const chart = { wrapperReady$: of(null), chartWrapper: {} };
      const control = { wrapperReady$: of(null), for: () => chart, controlWrapper: {} };
      (component as any)['controlWrappers'] = () => [control];

      setInput('data', []);

      component.ngOnInit();

      expect(dashboardMock.draw).toHaveBeenCalledWith(dataTableMock);
    });
  });

  describe('ngOnChanges', () => {
    type DashboardInput = 'data' | 'columns' | 'formatters';
    function changeInput(property: DashboardInput, newValue: unknown) {
      const oldValue = (component as any)[property]();
      setInput(property, newValue);
      component.ngOnChanges({ [property]: new SimpleChange(oldValue, newValue, oldValue == null) });
    }

    it('should not throw if called before initialization', () => {
      expect(() => component.ngOnChanges({})).not.toThrow();
    });

    it('should redraw the chart if the data changed', () => {
      const dashboardMock = { draw: jest.fn() };
      component['dashboard'] = dashboardMock as any;
      component['initialized'] = true;

      globalThis.google = { visualization: visualizationMock } as any;

      const data = [['row 1', 12]];
      changeInput('data', data);

      expect(visualizationMock.arrayToDataTable).toHaveBeenCalled();
      expect(dashboardMock.draw).toHaveBeenCalled();
    });

    it('should redraw the chart if the columns changed', () => {
      const dashboardMock = { draw: jest.fn() };
      component['dashboard'] = dashboardMock as any;
      component['initialized'] = true;

      globalThis.google = { visualization: visualizationMock } as any;

      setInput('data', []);

      const columns = ['test'];
      changeInput('columns', columns);

      expect(visualizationMock.arrayToDataTable).toHaveBeenCalled();
      expect(dashboardMock.draw).toHaveBeenCalled();
    });

    it('should redraw the chart if `formatters` changed', () => {
      const dashboardMock = { draw: jest.fn() };
      component['dashboard'] = dashboardMock as any;
      component['initialized'] = true;

      globalThis.google = { visualization: visualizationMock } as any;

      const data = [
        ['First Row', 10],
        ['Second Row', 11]
      ];
      setInput('data', data);

      const columns = ['Some label', 'Some values'];
      setInput('columns', columns);

      const dataTableMock = {};
      visualizationMock.arrayToDataTable.mockReturnValueOnce(dataTableMock);

      const formatter = { formatter: { format: jest.fn() }, colIndex: 1 };
      changeInput('formatters', [formatter]);

      expect(formatter.formatter.format).toHaveBeenCalled();
      expect(visualizationMock.arrayToDataTable).toHaveBeenCalled();
      expect(dashboardMock.draw).toHaveBeenCalled();
    });

    it('should not redraw if nothing changed', () => {
      const dashboardMock = { draw: jest.fn() };
      component['dashboard'] = dashboardMock as any;
      component['initialized'] = true;

      globalThis.google = { visualization: visualizationMock } as any;

      setInput('data', [['row 1', 12]]);
      setInput('columns', ['test']);

      component.ngOnChanges({});

      expect(visualizationMock.arrayToDataTable).not.toHaveBeenCalled();
      expect(dashboardMock.draw).not.toHaveBeenCalled();
    });
  });

  function setInput(name: 'data', value: unknown[][]): void;
  function setInput(name: 'columns', value: string[] | undefined): void;
  function setInput(name: 'formatters', value: unknown[] | undefined): void;
  function setInput(name: 'data' | 'columns' | 'formatters', value: unknown): void {
    fixture.componentRef.setInput(name, value as any);
  }
});
