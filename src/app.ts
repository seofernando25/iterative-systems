import { customElement, state } from "lit/decorators.js";
import "./katex-expr";
import { Chart, ChartConfiguration } from "chart.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";
import { isDenseMatrix, matrix, multiply, pow } from "mathjs";
import {
    CategoryScale,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
} from "chart.js";
import { LitElement, PropertyValues, html, css } from "lit";

Chart.register(CategoryScale);
Chart.register(LinearScale);
Chart.register(LineController);
Chart.register(PointElement);
Chart.register(LineElement);
Chart.register(Tooltip);

const MAX_DAYS = 10;

@customElement("app-el")
export class App extends LitElement {
    @state()
    infectionProbability = 0.03;

    @state()
    recoveryProbability = 0.05;

    @state()
    initialInfected = 1;

    @state()
    initialRecovered = 100;

    chartjsElementRef: Ref<HTMLCanvasElement> = createRef();
    chart?: Chart = undefined;

    chartConfig: ChartConfiguration = {
        type: "line",
        data: {
            labels: Array.from({ length: 1 + MAX_DAYS }, (_, i) => String(i)),
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
        ${notInfectedPercent} & ${infectionPercent} \\
        ${notRecoveredPercent} & ${recoveryPercent}
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

    infectedAtDay(day: number) {
        const chain = matrix([
            [1 - this.infectionProbability, this.infectionProbability],
            [this.recoveryProbability, 1 - this.recoveryProbability],
        ]);

        const poweredChain = pow(chain, day);
        if (!isDenseMatrix(poweredChain)) {
            throw new Error("Matrix must be dense");
        }

        const state = matrix([[this.initialInfected, this.initialRecovered]]);
        const result = multiply(state, poweredChain);

        const nInfected = result.get([0, 0]);
        const nRecovered = result.get([0, 1]);

        return [nInfected, nRecovered];
    }

    render() {
        return html`
            <h1>Iterative Systems: Simple Epidemic Model</h1>
            <katex-expr .expression=${this.formula()}></katex-expr>
            <br />
            <br />

            <table>
                <tr>
                    <td>
                        <label for="infectionProbability"
                            >Infection Probability</label
                        >
                    </td>
                    <td>
                        <input
                            id="infectionProbability"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            .value=${this.infectionProbability}
                            @input=${(e: Event) => {
                                const target = e.target as HTMLInputElement;
                                this.infectionProbability = Number(
                                    target.value
                                );
                            }}
                        />
                    </td>
                    <td>
                        <span
                            >${this.infectionProbability.toLocaleString(
                                undefined,
                                {
                                    style: "percent",
                                }
                            )}</span
                        >
                    </td>
                </tr>
                <tr>
                    <td>
                        <label for="recoveryProbability"
                            >Recovery Probability</label
                        >
                    </td>
                    <td>
                        <input
                            id="recoveryProbability"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value=${this.recoveryProbability}
                            @input=${(e: Event) => {
                                const target = e.target as HTMLInputElement;
                                this.recoveryProbability = Number(target.value);
                            }}
                        />
                    </td>
                    <td>
                        <span
                            >${this.recoveryProbability.toLocaleString(
                                undefined,
                                {
                                    style: "percent",
                                }
                            )}</span
                        >
                    </td>
                </tr>
                <tr>
                    <td>
                        <label for="initialInfected">Initial Infected</label>
                    </td>
                    <td>
                        <input
                            id="initialInfected"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value=${this.initialInfected}
                            @input=${(e: Event) => {
                                const target = e.target as HTMLInputElement;
                                this.initialInfected = Number(target.value);
                            }}
                        />
                    </td>
                    <td>
                        <span
                            >${this.initialInfected.toLocaleString(
                                undefined
                            )}</span
                        >
                    </td>
                </tr>
                <tr>
                    <td>
                        <label for="initialRecovered">Initial Recovered</label>
                    </td>
                    <td>
                        <input
                            id="initialRecovered"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value=${this.initialRecovered}
                            @input=${(e: Event) => {
                                const target = e.target as HTMLInputElement;
                                this.initialRecovered = Number(target.value);
                            }}
                        />
                    </td>
                    <td>
                        <span
                            >${this.initialRecovered.toLocaleString(
                                undefined
                            )}</span
                        >
                    </td>
                </tr>
            </table>
            <br />

            <div class="chart-wrapper">
                <canvas class="chart" ${ref(this.chartjsElementRef)}></canvas>
            </div>
        `;
    }

    protected updated(_changedProperties: PropertyValues): void {
        super.updated(_changedProperties);

        const infectionsGroups = Array.from({ length: 15 }, (_, i) => {
            return this.infectedAtDay(i); // [infected, recovered];
        });

        const infectedData = infectionsGroups.map((v) => v[0]);
        const recoveredData = infectionsGroups.map((v) => v[1]);

        if (this.chart) {
            this.chart.data.datasets[0].data = infectedData;
            this.chart.data.datasets[1].data = recoveredData;
            this.chart.update();
        }
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
        tr > td:first-child {
            text-align: left;
            width: 20%;
        }

        tr > td:nth-child(2) {
            width: 75%;
        }

        tr > td:last-child {
            width: 5%;
        }

        .chart-wrapper {
            height: 400px;
            margin: auto;
            position: relative;
        }
    `;
}
