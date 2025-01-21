/** @odoo-module **/

import { Component, onWillRender, useState } from "@odoo/owl";
import { useDateTimePicker } from "@web/core/datetime/datetime_hook";
import {
    areDatesEqual,
    deserializeDate,
    deserializeDateTime,
    formatDate,
    formatDateTime,
    today,
} from "@web/core/l10n/dates";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { ensureArray } from "@web/core/utils/arrays";
import { archParseBoolean } from "@web/views/utils";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

export class YearDateField extends Component {
    static props = {
        ...standardFieldProps,
        maxDate: { type: String, optional: true },
        minDate: { type: String, optional: true },
        placeholder: { type: String, optional: true },
        required: { type: Boolean, optional: true },
        warnFuture: { type: Boolean, optional: true },
    };

    static template = "web.DateTimeField";

    //-------------------------------------------------------------------------
    // Getters
    //-------------------------------------------------------------------------

    get field() {
        return this.props.record.fields[this.props.name];
    }

    get values() {
        return ensureArray(this.state.value);
    }

    get format() {
        return 'yyyy'
    }

    //-------------------------------------------------------------------------
    // Lifecycle
    //-------------------------------------------------------------------------

    setup() {
        const getPickerProps = () => {
            const value = this.getRecordValue();
            /** @type {DateTimePickerProps} */
            const pickerProps = {
                value,
                type: this.field.type,
                range: this.isRange(value),
            };
            if (this.props.maxDate) {
                pickerProps.maxDate = this.parseLimitDate(this.props.maxDate);
            }
            if (this.props.minDate) {
                pickerProps.minDate = this.parseLimitDate(this.props.minDate);
            }

            pickerProps.minPrecision = 'years'
            return pickerProps;
        };

        const dateTimePicker = useDateTimePicker({
            format: this.format,
            target: "root",
            get pickerProps() {
                return getPickerProps();
            },
            onChange: () => {
                this.state.range = this.isRange(this.state.value);
            },
            onApply: () => {
                const toUpdate = {};
                if (Array.isArray(this.state.value)) {
                    // Value is already a range
                    [toUpdate[this.startDateField], toUpdate[this.endDateField]] = this.state.value;
                } else {
                    toUpdate[this.props.name] = this.state.value;
                }
                // when startDateField and endDateField are set, and one of them has changed, we keep
                // the unchanged one to make sure ORM protects both fields from being recomputed by the
                // server, ORM team will handle this properly on master, then we can remove unchanged values
                if (!this.startDateField || !this.endDateField) {
                    // If startDateField or endDateField are not set, delete unchanged fields
                    for (const fieldName in toUpdate) {
                        if (areDatesEqual(toUpdate[fieldName], this.props.record.data[fieldName])) {
                            delete toUpdate[fieldName];
                        }
                    }
                } else {
                    // If both startDateField and endDateField are set, check if they haven't changed
                    if (areDatesEqual(toUpdate[this.startDateField], this.props.record.data[this.startDateField]) &&
                        areDatesEqual(toUpdate[this.endDateField], this.props.record.data[this.endDateField])) {
                        delete toUpdate[this.startDateField];
                        delete toUpdate[this.endDateField];
                    }
                }

                if (Object.keys(toUpdate).length) {
                    this.props.record.update(toUpdate);
                }
            },
        });
        // Subscribes to changes made on the picker state
        this.state = useState(dateTimePicker.state);
        this.openPicker = dateTimePicker.open;

        onWillRender(() => this.triggerIsDirty());
    }

    //-------------------------------------------------------------------------
    // Methods
    //-------------------------------------------------------------------------

    /**
     * @param {number} valueIndex
     */
    async addDate(valueIndex) {
        const values = this.values;
        values[valueIndex] = values[valueIndex ? 0 : 1];

        this.state.focusedDateIndex = valueIndex;
        this.state.value = values;
        this.state.range = true;

        this.openPicker(valueIndex);
    }

    /**
     * @param {number} valueIndex
     */
    getFormattedValue(valueIndex) {
        const value = this.values[valueIndex];
        return value
            ? this.field.type === "date"
                ? formatDate(value, { format: this.format })
                : formatDateTime(value)
            : "";
    }

    /**
     * @returns {DateTimePickerProps["value"]}
     */
    getRecordValue() {
        if (this.relatedField) {
            return [
                this.props.record.data[this.startDateField],
                this.props.record.data[this.endDateField],
            ];
        } else {
            return this.props.record.data[this.props.name];
        }
    }

    /**
     * @param {number} index
     */
    isDateInTheFuture(index) {
        return this.values[index] > today();
    }

    /**
     * @param {string} fieldName
     */
    isEmpty(fieldName) {
        return fieldName === this.startDateField ? !this.values[0] : !this.values[1];
    }

    /**
     * @param {DateTimePickerProps["value"]} value
     * @returns {boolean}
     */
    isRange(value) {
        if (!this.relatedField) {
            return false;
        }
        return (
            this.props.alwaysRange ||
            this.props.required ||
            ensureArray(value).filter(Boolean).length === 2
        );
    }

    /**
     * @param {string} value
     */
    parseLimitDate(value) {
        if (value === "today") {
            return value;
        }
        return this.field.type === "date" ? deserializeDate(value) : deserializeDateTime(value);
    }

    /**
     * @return {boolean}
     */
    shouldShowSeparator() {
        return (
            (this.props.alwaysRange &&
                (this.props.readonly
                    ? !this.isEmpty(this.startDateField) || !this.isEmpty(this.endDateField)
                    : true)) ||
            (this.state.range &&
                (this.props.required ||
                    (!this.isEmpty(this.startDateField) && !this.isEmpty(this.endDateField))))
        );
    }

    /**
     * The given props are used to compute the current value and compare it to
     * the state handled by the datetime hook.
     *
     * @param {boolean} [isDirty]
     */
    triggerIsDirty(isDirty) {
        this.props.record.model.bus.trigger(
            "FIELD_IS_DIRTY",
            isDirty ?? !areDatesEqual(this.getRecordValue(), this.state.value)
        );
    }

    //-------------------------------------------------------------------------
    // Handlers
    //-------------------------------------------------------------------------

    onInput() {
        this.triggerIsDirty(true);
    }
}

export const yearField = {
    component: YearDateField,
    displayName: _t('Year'),
    supportedOptions: [
        {
            label: _t("Earliest accepted date"),
            name: "min_date",
            type: "string",
            help: _t(`ISO-formatted date (e.g. "2018-12-31") or "%s".`, "today"),
        },
        {
            label: _t("Latest accepted date"),
            name: "max_date",
            type: "string",
            help: _t(`ISO-formatted date (e.g. "2018-12-31") or "%s".`, "today"),
        },
        {
            label: _t("Warning for future dates"),
            name: "warn_future",
            type: "boolean",
            help: _t(`Displays a warning icon if the input dates are in the future.`),
        },
    ],
    supportedTypes: ["date"],
    extractProps: ({ attrs, options }, dynamicInfo) => ({
        maxDate: options.max_date,
        minDate: options.min_date,
        placeholder: attrs.placeholder,
        required: dynamicInfo.required,
        warnFuture: archParseBoolean(options.warn_future),
    })
}

registry
    .category("fields")
    .add("year", yearField)