import { browserService } from './browser.js';

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface RenderChartOptions {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  data: ChartData;
  title?: string;
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
}

export class ChartService {
  private static instance: ChartService | null = null;

  public static getInstance(): ChartService {
    if (!ChartService.instance) {
      ChartService.instance = new ChartService();
    }
    return ChartService.instance;
  }

  /**
   * Renders high-DPI data visualizations using Chart.js inside headless Chromium.
   */
  public async renderChart(options: RenderChartOptions): Promise<Buffer> {
    const {
      type,
      data,
      title,
      theme = 'dark',
      width = 1000,
      height = 600,
    } = options;

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#090d16' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const subtextColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    // Provide modern vibrant default colors if none provided
    const palette = [
      '#6366f1', // indigo
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#8b5cf6', // purple
    ];

    const processedData = {
      labels: data.labels,
      datasets: data.datasets.map((ds, idx) => {
        const defaultColor = palette[idx % palette.length];
        return {
          ...ds,
          backgroundColor:
            ds.backgroundColor ||
            (['pie', 'doughnut', 'polarArea'].includes(type) ? palette : defaultColor),
          borderColor: ds.borderColor || (type === 'line' ? defaultColor : undefined),
          borderWidth: ds.borderWidth ?? (type === 'line' ? 3 : 1),
        };
      }),
    };

    const isRadial = ['pie', 'doughnut', 'radar', 'polarArea'].includes(type);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      background-color: ${bgColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
    }
    #container {
      width: 100%;
      height: 100%;
      position: relative;
    }
  </style>
</head>
<body>
  <div id="container">
    <canvas id="chartCanvas"></canvas>
  </div>
  <script>
    const ctx = document.getElementById('chartCanvas').getContext('2d');
    new Chart(ctx, {
      type: ${JSON.stringify(type)},
      data: ${JSON.stringify(processedData)},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          title: {
            display: ${title ? 'true' : 'false'},
            text: ${JSON.stringify(title || '')},
            color: ${JSON.stringify(textColor)},
            font: { size: 20, weight: 'bold' },
            padding: { top: 0, bottom: 20 }
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: ${JSON.stringify(subtextColor)},
              font: { size: 13, weight: '500' },
              padding: 16
            }
          }
        },
        scales: ${
          isRadial
            ? '{}'
            : `{
          x: {
            grid: { color: ${JSON.stringify(gridColor)} },
            ticks: { color: ${JSON.stringify(subtextColor)}, font: { size: 12 } }
          },
          y: {
            grid: { color: ${JSON.stringify(gridColor)} },
            ticks: { color: ${JSON.stringify(subtextColor)}, font: { size: 12 } }
          }
        }`
        }
      }
    });
  </script>
</body>
</html>`;

    return browserService.renderImage({
      html,
      width,
      height,
      type: 'png',
      wait_for: '#chartCanvas',
      delay_ms: 150,
    });
  }
}

export const chartService = ChartService.getInstance();
