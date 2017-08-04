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
module powerbi.extensibility.visual {
    "use strict";
    interface DataModel {
        displayName: string;
        actual: string;
        target: string;
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
            debugger;
            Visual.render(this.root, data, this.settings);
        }

        private static converter(dataView: DataView, settings: VisualSettings): DataModel[] {
            const data: DataModel[] = [];
            let targetIndex: number = 0;
            let actualIndex: number = 0;

            dataView.table.columns.forEach((column: DataViewMetadataColumn, index: number) => {
                let item: DataModel = {} as DataModel;
                const formatter: IValueFormatter = valueFormatter.create({
                    precision: settings.dataLabels.decimalPlaces,
                    value: settings.dataLabels.labelDisplayUnits,
                    columnType: column ? column.type : undefined
                });
                if (column.roles["actual"]) {
                    item.displayName = column.displayName;
                    item.actual = formatter.format(dataView.table.rows[0][column.index]);
                    data[actualIndex] = { ...(data[actualIndex] || {}), ...item };
                    actualIndex++;
                }
                if (column.roles["target"]) {
                    item.target = formatter.format(dataView.table.rows[0][column.index]);
                    data[targetIndex] = { ...(data[targetIndex] || {}), ...item };
                    targetIndex++;
                }
            });
            return data;
        }

        private static render(container: HTMLElement, data: DataModel[], settings: VisualSettings) {
            container.innerHTML = "";
            const fragment: DocumentFragment = document.createDocumentFragment();
            for (let i = 0; i < data.length; i++) {
                fragment.appendChild(Visual.createTile(data[i], settings));
            }
            container.appendChild(fragment);
        }

        private static createTile(data: DataModel, settings: VisualSettings): HTMLElement {
            const element: HTMLElement = document.createElement("div");
            element.classList.add("tile");
            element.appendChild(this.createTitleElement(data, settings));
            element.appendChild(this.createActualValueElement(data, settings));
            element.appendChild(this.createTargetValueElement(data, settings));
            return element;
        }

        private static createTitleElement(data: DataModel, settings: VisualSettings): HTMLElement {
            const element: HTMLElement = document.createElement("h1");
            element.classList.add("title");
            element.style.display = settings.categoryLabels.show ? "block" : "none";
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
            valueElement.textContent = data.actual;

            const indicatorElement: HTMLElement = document.createElement("div");
            indicatorElement.classList.add("indicator");
            indicatorElement.style.color = settings.indicator.textColor;
            indicatorElement.style.backgroundColor = settings.indicator.negativeColor;
            const span: HTMLElement = document.createElement("span");
            span.textContent = "!";
            indicatorElement.appendChild(span);

            element.appendChild(valueElement);
            element.appendChild(indicatorElement);
            return element;
        }

        private static createTargetValueElement(data: DataModel, settings: VisualSettings): HTMLElement {
            return document.createElement("div");
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