import {
    CategoryScale,
    Chart,
    ChartConfiguration,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
} from "chart.js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";
import { matrix, multiply, pow } from "mathjs";
import "./katex-expr";

Chart.register(CategoryScale);
Chart.register(LinearScale);
Chart.register(LineController);
Chart.register(PointElement);
Chart.register(LineElement);
Chart.register(Tooltip);

const MAX_DAYS = 32;

@customElement("app-el")
export class App extends LitElement {
    @state()
    infectionProbability = 0.03;

    @state()
    recoveryProbability = 0.05;

    @state()
    initialInfected = 1;

    @state()
    initialHealthy = 100;

    chartjsElementRef: Ref<HTMLCanvasElement> = createRef();
    // @ts-expect-error
    chart: Chart;

    @state()
    days = MAX_DAYS / 2;

    chartConfig: ChartConfiguration = {
        type: "line",
        data: {
            datasets: [
                {
                    label: "Infected",
                    data: [],
                    borderColor: "#f00",
                    fill: false,
                },
                {
                    label: "Recovered",
                    data: [],
                    borderColor: "#0f0",
                    fill: false,
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            interaction: {
                intersect: false,
                mode: "index",
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    usePointStyle: true,
                },
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: "Day",
                    },
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: "Infected/Recovered",
                    },
                    suggestedMin: 0,
                },
            },
        },
    };

    @state()
    infectedData: number[] = [];

    @state()
    recoveredData: number[] = [];

    protected firstUpdated(_changedProperties: PropertyValues): void {
        super.firstUpdated(_changedProperties);

        this.chart = new Chart(this.chartjsElementRef.value!, this.chartConfig);
    }

    formula() {
        const notInfected = 1 - this.infectionProbability;
        const notRecovered = 1 - this.recoveryProbability;

        const fmtOptions: Intl.NumberFormatOptions = {
            style: "percent",
        };

        const notInfectedPercent = notInfected
            .toLocaleString(undefined, fmtOptions)
            .replace(/%/g, "\\%");

        const notRecoveredPercent = notRecovered
            .toLocaleString(undefined, fmtOptions)
            .replace(/%/g, "\\%");

        const infectionPercent = this.infectionProbability
            .toLocaleString(undefined, fmtOptions)
            .replace(/%/g, "\\%");

        const recoveryPercent = this.recoveryProbability
            .toLocaleString(undefined, fmtOptions)
            .replace(/%/g, "\\%");

        return String.raw`
        \begin{bmatrix}
        ${notInfectedPercent} & ${recoveryPercent} \\
        ${infectionPercent} & ${notRecoveredPercent}
        \end{bmatrix}^n
        \begin{bmatrix}
        x \\
        y
        \end{bmatrix}
        =
        \begin{bmatrix}
        x' \\
        y'
        \end{bmatrix}
        `;
    }

    infectedAtDay(day: number, infectionProb: number, recoveryProb: number) {
        const transitionMatrix = matrix([
            [1 - infectionProb, recoveryProb],
            [infectionProb, 1 - recoveryProb],
        ]);
        const transitionMatrixPowered = pow(transitionMatrix, day);
        const initialStateMatrix = matrix([
            this.initialHealthy,
            this.initialInfected,
        ]);
        const finalStateMatrix = multiply(
            transitionMatrixPowered,
            initialStateMatrix
        );
        const recovered = finalStateMatrix.get([0]);
        const infected = finalStateMatrix.get([1]);

        // infected + recovered = 100
        const expectedTotal = this.initialInfected + this.initialHealthy;
        const total = infected + recovered;
        const diff = total - expectedTotal;
        if (Math.abs(diff) > 0.1) {
            throw new Error(`Total is not 100: ${total}`);
        }

        return { infected, recovered };
    }

    render() {
        const sliders = [
            {
                label: "Infection Probability",
                min: 0,
                max: 1,
                step: 0.01,
                value: this.infectionProbability,
                onChange: (n: number) => {
                    this.infectionProbability = n;
                },
                style: "percent",
            },
            {
                label: "Recovery Probability",
                min: 0,
                max: 1,
                step: 0.01,
                value: this.recoveryProbability,
                onChange: (n: number) => {
                    this.recoveryProbability = n;
                },
                style: "percent",
            },
            {
                label: "Initial Infected",
                min: 0,
                max: 100,
                step: 1,
                value: this.initialInfected,
                onChange: (n: number) => {
                    this.initialInfected = n;
                },
            },
            {
                label: "Initial Healthy",
                min: 0,
                max: 100,
                step: 1,
                value: this.initialHealthy,
                onChange: (n: number) => {
                    this.initialHealthy = n;
                },
            },
            {
                label: "Days",
                min: 0,
                max: MAX_DAYS,
                step: 1,
                value: this.days,
                onChange: (n: number) => {
                    this.days = n;
                },
            },
        ];

        return html`
            <h1>Iterative Systems: Simple Epidemic Model</h1>
            <katex-expr .expression=${this.formula()}></katex-expr>
            <br />
            <br />

            <table>
                ${sliders.map(
                    (s) => html`
                        <tr>
                            <td>
                                <label for=${s.label}>${s.label}</label>
                            </td>
                            <td>
                                <input
                                    id=${s.label}
                                    type="range"
                                    min=${s.min}
                                    max=${s.max}
                                    step=${s.step}
                                    value=${s.value}
                                    @input=${(e: Event) => {
                                        // @ts-expect-error
                                        s.onChange(Number(e.target.value));
                                    }}
                                />
                            </td>
                            <td>
                                <span
                                    >${s.value.toLocaleString(undefined, {
                                        // @ts-expect-error
                                        style: s.style,
                                    })}</span
                                >
                            </td>
                        </tr>
                    `
                )}
            </table>
            <br />

            <div class="chart-wrapper">
                <canvas class="chart" ${ref(this.chartjsElementRef)}></canvas>
            </div>
        `;
    }

    protected updated(_changedProperties: PropertyValues): void {
        super.updated(_changedProperties);

        const infectionsGroups = Array.from(
            { length: 1 + this.days },
            (_, i) => {
                return this.infectedAtDay(
                    i,
                    this.infectionProbability,
                    this.recoveryProbability
                );
            }
        );
        this.chart.data.labels = Array.from({ length: 1 + this.days }, (_, i) =>
            String(i)
        );

        this.chart.data.datasets[0].data = infectionsGroups.map(
            (v) => v.infected
        );
        this.chart.data.datasets[1].data = infectionsGroups.map(
            (v) => v.recovered
        );
        this.chart.update();
    }

    static styles = css`
        :host {
            width: 100%;
            text-align: center;
        }

        table {
            width: 100%;

            input {
                width: 100%;
            }
        }

        tr {
            td:first-child {
                text-align: left;
                width: 20%;
            }

            td:nth-child(2) {
                width: 70%;
            }

            td:last-child {
                width: 10%;
            }
        }

        .chart-wrapper {
            height: 400px;
            margin: auto;
            position: relative;
        }
    `;
}
