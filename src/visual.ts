/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;

enum Trend {
    Neutral,
    Negative,
    Possitive
}
module powerbi.extensibility.visual {
    "use strict";
    interface DataModel {
        displayName: string;
        actual: number;
        actualString: string;
        target: number;
        targetString: string;
        percentage: number | string;
        trend: Trend;
    }

    export class Visual implements IVisual {
        private settings: VisualSettings;
        private root: HTMLElement;

        constructor(options: VisualConstructorOptions) {
            const visualRoot: HTMLElement = options.element;
            this.root = document.createElement("div");
            this.root.classList.add("root");
            visualRoot.appendChild(this.root);
        }

        public update(options: VisualUpdateOptions) {
            if (!options ||
                !options.dataViews ||
                !options.dataViews.length ||
                !(options.type === VisualUpdateType.All || options.type === VisualUpdateType.Data)) {
                return;
            }
            this.settings = Visual.parseSettings(options.dataViews[0]);
            const data: DataModel[] = Visual.converter(options.dataViews[0], this.settings);
            Visual.render(this.root, data, this.settings);
        }

        private static converter(dataView: DataView, settings: VisualSettings): DataModel[] {
            const data: DataModel[] = [];
            let targetIndex: number = 0;
            let actualIndex: number = 0;
            const percentageFormatter: IValueFormatter = valueFormatter.create({ format: "0.00 %;-0.00 %;0.00 %" });

            dataView.table.columns.forEach((column: DataViewMetadataColumn, index: number) => {
                let item: DataModel = {} as DataModel;
                const formatter: IValueFormatter = valueFormatter.create({
                    precision: settings.dataLabels.decimalPlaces,
                    value: settings.dataLabels.labelDisplayUnits,
                    columnType: column ? column.type : undefined
                });
                if (column.roles["actual"]) {
                    item.displayName = column.displayName;
                    item.actual = dataView.table.rows[0][column.index] as number;
                    item.actualString = formatter.format(item.actual);
                    data[actualIndex] = { ...(data[actualIndex] || {}), ...item };
                    actualIndex++;
                }
                if (column.roles["target"]) {
                    item.target = dataView.table.rows[0][column.index] as number;
                    item.targetString = formatter.format(item.target);
                    data[targetIndex] = { ...(data[targetIndex] || {}), ...item };
                    targetIndex++;
                }
            });
            data.map((item: DataModel) => {
                const percentage: number = (item.actual - item.target) / item.target;
                if (percentage > settings.indicator.positivePercentageVal) {
                    item.trend = Trend.Possitive;
                } else if (percentage < settings.indicator.negativePercentageVal) {
                    item.trend = Trend.Negative;
                } else {
                    item.trend = Trend.Neutral;
                }
                item.percentage = percentageFormatter.format(percentage);
            });
            return data;
        }

        private static render(container: HTMLElement, data: DataModel[], settings: VisualSettings) {
            container.innerHTML = "";
            const fragment: DocumentFragment = document.createDocumentFragment();
            for (let i = 0; i < data.length; i++) {
                fragment.appendChild(Visual.createTile(data[i], settings));
            }
            container.appendChild(fragment)
        }

        private static createTile(data: DataModel, settings: VisualSettings): HTMLElement {
            const element: HTMLElement = document.createElement("div");
            element.classList.add("tile");
            if (data.actual !== undefined) {
                element.appendChild(this.createTitleElement(data, settings));
                element.appendChild(this.createActualValueElement(data, settings));
                if (data.target !== undefined) {
                    element.appendChild(this.createTargetValueElement(data, settings));
                }
            }
            return element;
        }

        private static createTitleElement(data: DataModel, settings: VisualSettings): HTMLElement {
            const element: HTMLElement = document.createElement("h1");
            element.classList.add("title");
            element.style.display = settings.categoryLabels.show ? "inherit" : "none";
            element.style.whiteSpace = settings.wordWrap.show ? "inherit" : "nowrap";
            element.style.color = settings.categoryLabels.color;
            element.style.fontFamily = settings.categoryLabels.fontFamily;
            element.style.fontSize = `${settings.categoryLabels.fontSize}px`;
            element.textContent = data.displayName;
            return element;
        }

        private static createActualValueElement(data: DataModel, settings: VisualSettings): HTMLElement {
            const element: HTMLElement = document.createElement("div");
            element.classList.add("actual");
            element.style.fontSize = `${settings.dataLabels.fontSize}px`;
            const valueElement: HTMLElement = document.createElement("h2");
            valueElement.style.color = settings.dataLabels.color;
            valueElement.style.fontFamily = settings.dataLabels.fontFamily;
            valueElement.style.fontWeight = 'normal';

            if (settings.indicator.dataDisplayRole === "$")
                valueElement.textContent = `${settings.indicator.dataDisplayRole}${data.actualString}`;
            else
                valueElement.textContent = `${data.actualString}${settings.indicator.dataDisplayRole }`;
             
            const indicatorElement: HTMLElement = document.createElement("div");
            indicatorElement.classList.add("indicator");
            indicatorElement.style.color = settings.indicator.textColor;
            const span: HTMLElement = document.createElement("span");
            if (data.trend === Trend.Possitive) {
                indicatorElement.style.backgroundColor = settings.indicator.positiveColor;
                span.textContent = settings.indicator.positiveText;
                span.style.marginTop = "-.12em";
            } else if (data.trend === Trend.Negative) {
                indicatorElement.style.backgroundColor = settings.indicator.negativeColor;
                span.textContent = settings.indicator.negativeText;
                span.style.marginTop = "-.22em";
            } else if (data.trend === Trend.Neutral)
            {
                indicatorElement.style.backgroundColor = settings.indicator.neutralColor;
                span.textContent = settings.indicator.neutralText;
                span.style.marginTop = "-.28em";
            }
            
            indicatorElement.style.marginLeft = settings.indicator.leftMargin;
            indicatorElement.appendChild(span);

            element.appendChild(valueElement);
            element.appendChild(indicatorElement);
            return element;
        }

        private static createTargetValueElement(data: DataModel, settings: VisualSettings): HTMLElement {
            const element: HTMLElement = document.createElement("span");
            const procentageElement: HTMLElement = document.createElement("span");
            /*
            if (data.trend === Trend.Possitive) {
                procentageElement.style.color = settings.indicator.positiveColor;
            }
            else if (data.trend === Trend.Negative)
            {
                procentageElement.style.color = settings.indicator.negativeColor;
            }
            
            else
            //if (data.trend === Trend.Neutral)
            {
                procentageElement.style.color = settings.indicator.neutralColor;
            }
            */
            procentageElement.style.color =
                data.trend === Trend.Negative
                    ? settings.indicator.negativeColor

                    : data.trend === Trend.Possitive ? settings.indicator.positiveColor 
                    : data.trend === Trend.Neutral ? settings.indicator.neutralColor : null;
            
            procentageElement.textContent = `(${data.percentage})`;
            if (settings.indicator.dataDisplayRole === "$")
                element.textContent = `Budget: ${settings.indicator.dataDisplayRole}${data.targetString}  `;
            else
                element.textContent = `Budget: ${data.targetString}${settings.indicator.dataDisplayRole} `;
            element.appendChild(procentageElement);
            element.style.fontSize = '12';
            element.style.color = "#334356";
            return element;
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }
    }
}