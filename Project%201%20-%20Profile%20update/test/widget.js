return Widgets.FacetsBar.extend({

    getCollection: function () {
        var coll = Widgets.FacetsBar.prototype.getCollection.apply(this, arguments);
        if (! this.model.get('aggregation') || this.model.get('aggregation') == '--none--') {
            return coll;
        }
        var _buildAggregationsFetchBak = coll._buildAggregationsFetch;
        var aggregationFacet = _.first(this.model.get('aggregationFacet')).facet;
        var aggregationMethod = this.model.get('aggregation');

        if (window.localStorage.getItem('evaLanguage') === 'de' && !this.options.edit) {
            if (aggregationFacet === 'past-operation-mode-text') {
                aggregationFacet = 'past-operation-mode-text-de';
            }

            if (aggregationFacet === 'eff-reason-text') {
                aggregationFacet = 'eff-reason-text-de';
            }
        }

        // Don't request number of facets with an aggregation
        // var nof_facets = coll.extraParams.nof_facets;
        coll._buildAggregationsFetch = function () {
            var ret = JSON.parse(_buildAggregationsFetchBak.apply(this, arguments));
            ret['facets']['aggregation'] = {
                'fields': ret['facets']['fields'],
                'method': aggregationMethod,
            }
            ret['facets']['fields'] = aggregationFacet;
            // Don't request number of facets
            // ret['facets']['size'] = nof_facets;
            // TODO: find better way to ensure we get all facets required
            ret['facets']['size'] = 1000;
            return JSON.stringify(ret);
        };
        return coll;
    },

    formatAggregations: function () {
        if (this.model.get('aggregation') && this.model.get('aggregation') != '--none--') {
            var values = this.collection.models[0].facets.models[0].attributes.values;
            var sorted_values = this.collection.models[0].facets.models[0].attributes.sorted_values;
            for (var i=0; i<values.length; i++) {
                if (values[i]['values']) {
                    var correct_value = values[i].values[0].value;
                    values[i].value = correct_value;
                    for (var j=0; j<sorted_values.length; j++) {
                        if (sorted_values[j].name == values[i].name) {
                            sorted_values[j].value = correct_value;
                        }
                    }
                }
            }
            // now find the top nof_facets values
            sorting_fn = function(a, b){
                var x = a.value,
                    y = b.value;
                if (x < y) return 1;
                if (x > y) return -1;
                return 0;
            };
            sorted_values.sort(sorting_fn);
            this.collection.models[0].facets.models[0].attributes.sorted_values.splice(this.collection.extraParams.nof_facets);
            values.sort(sorting_fn);
            this.collection.models[0].facets.models[0].attributes.values.splice(this.collection.extraParams.nof_facets);
        }
    },

    beforeRender: function () {
        this.formatAggregations();
    },

    updateChart: function () {
        this.formatAggregations();
        Widgets.FacetsBar.prototype.updateChart.apply(this, arguments);
    },

    afterRender: function () {

        var minuteFormatter = function (total_seconds, padding) {
            var days = Math.floor(total_seconds / (60 * 60 * 24));
            var hours = Math.floor(total_seconds / 60 / 60) - days * 24;
            var minutes = Math.floor(total_seconds / 60) - (days * 60 * 24 + hours * 60);
            var seconds = Math.round(total_seconds) - (days * 60 * 60 * 24 + hours * 60 * 60 + minutes * 60);

            var formatted_value = '';
            if (days > 0) {
                formatted_value += days + "d ";
            }
            if (hours > 0 || (formatted_value.length > 0 && padding)) {
                formatted_value += hours + "h ";
            }
            if (minutes > 0 || (formatted_value.length > 0 && padding)) {
                formatted_value += minutes + "m ";
            }
            if (seconds > 0 || (formatted_value.length > 0 && padding)) {
                formatted_value += seconds + "s ";
            }

            return formatted_value.trim();
        };

        var tooltipMinuteFormatter = function (options) {
            var class_name = options.chart.hoverPoint.id;
            var total_seconds = options.chart.hoverPoint.y;
            var formatted_value = minuteFormatter(total_seconds, padding=true);
            return class_name.bold() + '<br>' + formatted_value;
        };

        var tooltipEventFormatter = function (options) {
            var class_name = options.chart.hoverPoint.id;
            return class_name.bold() + '<br>' + options.chart.hoverPoint.y + ' events';
        };

        var yAxisMinuteFormatter = function () {
            return minuteFormatter(this.value, padding=false);
        };

        var tickIntervalFinder = function (series, maxValue) {
            if (maxValue == 0) {
                for (i in series) {
                    maxValue = Math.max(maxValue, _.max(series[i].data));
                }
            }

            /* 4 days */
            if (maxValue > 60 * 60 * 24 * 4) {
                var integerDays = Math.floor(maxValue / (60 * 60 * 24));
                return Math.floor(integerDays / 4) * 60 * 24;
            }

            /* 1 day */
            if (maxValue > 60 * 60 * 24) {
                return 60 * 60 * 6;
                // Represents 6 hour buckets, 4 plots per day
            }
            /* 6 hours */
            if (maxValue > 60 * 60 * 6) {
                return 60 * 60 * 2;
                // Represents 2 hour buckets, 3 plots per 6 hours
            }
            /* 1 hour */
            if (maxValue > 60 * 60) {
                return 30 * 60;
                // Represents 1 hour buckets, 2 plots per 1 hours
            }
            /* 10 minutes */
            if (maxValue > 10 * 60) {
                return 5 * 60;
                // Represents 10 min buckets, 5 plots per 10 minutes
            }
            /* 1 minute */
            if (maxValue > 1 * 60) {
                return 60 / 2;
                // Represents 1 min buckets, 2 plots per 1 minute
            }
            /* 10 seconds */
            if (maxValue > 10) {
                return 60 / 30;
                // Represents 10 second buckets, 2 plots per 10 seconds
            }
            /* 1 second */
            return 1;
            // Represents 1 second buckets, 1 plots per 1 seconds
        };

        var baseChartOptions = this.chart._getChartOptions;

        var that = this;
        this.chart._getChartOptions = function () {
            var chartOptions = baseChartOptions.call(this);

            if (this.model.get('formatMinutes')) {
                chartOptions.tooltip.formatter = tooltipMinuteFormatter;
                chartOptions.yAxis.labels.formatter = yAxisMinuteFormatter;
                chartOptions.yAxis.tickInterval = tickIntervalFinder(chartOptions.series[0].data);
            } else {
                chartOptions.tooltip.formatter = tooltipEventFormatter;
            }

            if (this.model.get('yAxisTitle')) {
                chartOptions.yAxis.title.text = this.model.get('yAxisTitle');
            }

            var sortingFn = function(a, b) {
                if (a.id && a.id.includes(' - ')) {
                    var x = parseInt(a.id.split(' - ')[0]);
                    var y = parseInt(b.id.split(' - ')[0]);
                } else if (_.isString(a) && a.includes(' - ')) {
                    var x = parseInt(a.split(' - ')[0]);
                    var y = parseInt(b.split(' - ')[0]);
                } else if (a.id) {
                    var c = a.id;
                    var d = b.id;
                } else {
                    var c = a;
                    var d = b;
                }

                if (x > y) {return -1;}
                if (x < y) {return 1;}

                if (c && c.split('...').length == 2 || d && d.indexOf('>') >= 0) {
                    // ascending order for time buckets
                    const order = [
                        "0 sec. ... 5 sec.",
                        "> 5 sec. ... 1 min.",
                        "> 1 min. ... 10 min.",
                        "> 10 min. ... 20 min.",
                        "> 20 min. ... 30 min.",
                        "> 30 min. ... 40 min.",
                        "> 40 min. ... 50 min.",
                        "> 50 min. ... 60 min.",
                        "> 1 hr. ... 2 hrs.",
                        "> 2 hrs. ... 3 hrs.",
                        "> 3 hrs. ... 4 hrs.",
                        "> 4 hrs. ... 5 hrs.",
                        "> 5 hrs. ... 6 hrs.",
                        "> 6 hrs. ... 7 hrs.",
                        "> 7 hrs."]
                    var x = order.indexOf(c);
                    var y = order.indexOf(d);
                    if (x < y) {return -1;}
                    if (x > y) {return 1;}
                }
                return 0;
            };
            // custom sort if we are showing time buckets
            chartOptions.series[0].data.sort(sortingFn);
            chartOptions.xAxis.categories.sort(sortingFn);

            // Sorting was breaking the color mapping so we manually do it again.
            if (!this.options.edit && chartOptions.series[0].data && chartOptions.series[0].data[0].id.includes(' - ')) {
                chartOptions.colors = that._reEnsureColors(chartOptions.series[0].data);
            }

            // fix selection of facet when aggregating
            var _onPointClick = function(ev) {
                _.preventDefault(ev);
                let facet = _.first(this.model.get('aggregationFacet')).facet,
                    value = ev.point.id;

                if (window.localStorage.getItem('evaLanguage') === 'de' && !this.options.edit) {
                    if (facet === 'past-operation-mode-text') {
                        facet = 'past-operation-mode-text-de';
                    }

                    if (facet === 'eff-reason-text') {
                        facet = 'eff-reason-text-de';
                    }
                }

                this.options.frozen && ev.point.select();

                // Ignore clicks on "Rest" slice
                if (value !== 'Rest') {
                    this.trigger('dirty', facet, value);
                }
            };

            if (this.model.get('aggregation') && this.model.get('aggregation') != '--none--'){
                chartOptions.plotOptions.series.events.click = _.bind(_onPointClick, this);
            }

            return chartOptions;
        };
    },

    _reEnsureColors(data) {
        var colors = this.options.theme.get('colorOverrides');
        var keys = _.keys(this.options.theme.get('colorOverrides'));

        var facetsInOrder = data.map(function(dataPoint) {
            return _.find(keys, function(key) {
                return key.includes(dataPoint.name) || key.includes(dataPoint.id);
            });
        });

        var colorsInOrder = facetsInOrder.map(function(facet) {
            return colors[facet];
        });

        return colorsInOrder;
    },
});
