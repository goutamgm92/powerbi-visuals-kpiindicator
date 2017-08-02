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
        private root: d3.Selection<any>;

        constructor(options: VisualConstructorOptions) {
            this.root = d3.select(options.element)
                .append("div")
                .classed("root", true);
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

        private static render(container: d3.Selection<any>, data: DataModel, settings: VisualSettings) {
            container.selectAll("*").remove();
            const rootSelectoin: d3.selection.Update<DataModel> = container.data([data]);
            rootSelectoin
                .append("p")
                .attr("id", "value")
                .classed("value", true)
                .style({
                    "color": settings.dataLabels.color,
                    "font-family": settings.dataLabels.fontFamily,
                    "font-size": `${settings.dataLabels.fontSize}px`

                })
                .text((d: DataModel) => d.value);

            rootSelectoin
                .append("label")
                .attr("for", "value")
                .classed("label", true)
                .style({
                    "color": settings.categoryLabels.color,
                    "font-size": `${settings.categoryLabels.fontSize}px`,
                    "font-family": settings.categoryLabels.fontFamily,
                    "display": settings.categoryLabels.show ? "block" : "none",
                    "white-space": settings.wordWrap.show ? "inherit" : "nowrap"
                })
                .text((d: DataModel) => d.displayName);
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