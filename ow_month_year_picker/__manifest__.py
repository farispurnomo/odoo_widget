# -*- coding: utf-8 -*-
{
    'name': "Month Year Picker",

    'summary': "Month Year Picker Odoo",

    'author': "Faris Purnomo",
    'website': "https://github.com/farispurnomo",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/15.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '18.0.0.1',
    'license': 'LGPL-3',
	'installable': True,

    # any module necessary for this one to work correctly
    'depends': ['base'],

    # always loaded
    'data': [
    ],
    # only loaded in demonstration mode
    'demo': [
    ],

    'assets'        : {
        'web.assets_backend': [
            'ow_month_year_picker/static/src/js/month_field.js',
            'ow_month_year_picker/static/src/js/year_field.js'
        ]
    }, 
}

