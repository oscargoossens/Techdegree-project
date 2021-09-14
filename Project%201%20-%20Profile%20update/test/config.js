return Pages.FacetsBar.extend({
    customNormal: [
        {
            view: Properties.Bool,
            config: {
                inputName: 'formatMinutes',
                infoText: 'Format Minute values?',
                defaultValue: false
            }
        },
        {
            view: Properties.Multiselect,
            config: {
                inputName: 'sortOrder',
                infoText: 'Define a custom sort order for the lines and legend',
                options: [
                    { label: 'Normal', value: 'normal', default: true },
                    { label: 'Ascending', value: 'ascending'},
                    { label: 'Descending', value: 'descending'}
                ]
            }
        },
        {
            view: Properties.Text,
            config: {
                inputName: 'yAxisTitle',
                infoText: 'yAxis Title'
            }
        },
        {
            view: Properties.Facet,
            config: {
                inputName: 'aggregationFacet',
                infoText: 'Aggregation Facet'
            }
        },
        {
            view: Properties.Multiselect,
            config: {
                inputName: 'aggregation',
                infoText: 'Define an aggregation',
                options: [
                    {'label':'--none--','value':'--none--'},
                    {'label':'Count','value':'cardinality'},
                    {'label':'Sum','value':'sum'},
                    {'label':'Min','value':'min'},
                    {'label':'Max','value':'max'},
                    {'label':'Mean','value':'avg'},
                    {'label':'Median','value':'percentiles'}
                ]
            }
        }
    ]
});
