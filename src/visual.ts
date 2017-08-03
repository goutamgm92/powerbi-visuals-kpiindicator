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
        value: string;
        displayName: string;
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
            const data = Visual.converter(options.dataViews[0], this.settings);
            Visual.render(this.root, data, this.settings);
        }

        private static converter(dataView: DataView, settings: VisualSettings): DataModel {
            const metadata: DataViewMetadataColumn = dataView.metadata.columns[0];
            const formatter: IValueFormatter = valueFormatter.create({
                precision: settings.dataLabels.decimalPlaces,
                value: settings.dataLabels.labelDisplayUnits ? settings.dataLabels.labelDisplayUnits : dataView.single.value,
                columnType: metadata ? metadata.type : undefined
            });
            return {
                displayName: metadata.displayName,
                value: formatter.format(dataView.single.value)
            };
        }

        private static render(container: HTMLElement, data: DataModel, settings: VisualSettings) {
            container.innerHTML = "";
            const valueElement: HTMLElement = document.createElement("p");
            valueElement.id = "value";
            valueElement.classList.add("value");
            valueElement.style.color = settings.dataLabels.color;
            valueElement.style.fontFamily = settings.dataLabels.fontFamily;
            valueElement.style.fontSize = `${settings.dataLabels.fontSize}px`;
            valueElement.textContent = data.value;

            const labelElement: HTMLElement = document.createElement("p");
            labelElement.classList.add("label");
            labelElement.setAttribute("for", "value");
            labelElement.style.position = settings.categoryLabels.show ? "block" : "none";
            labelElement.style.whiteSpace = settings.wordWrap.show ? "inherit" : "nowrap";
            labelElement.style.color = settings.categoryLabels.color;
            labelElement.style.fontFamily = settings.categoryLabels.fontFamily;
            labelElement.style.fontSize = `${settings.categoryLabels.fontSize}px`;
            labelElement.textContent = data.displayName;

            container.appendChild(valueElement);
            container.appendChild(labelElement);
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