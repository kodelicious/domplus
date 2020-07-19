/**
 * Here you can create watched properties for a given model.
 */
dp.watchers.product = {
    _formatPrice: function (value) {
        return new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: 'EUR'
        }).format(value).substr(2, value.length);
    },

    _unformatPrice: function (value) {
        // no need to unformat a number
        if (typeof value === 'number') {
            return value;
        }

        const decimal = ',';
        const regex = new RegExp("[^0-9-"+decimal+"]", ["g"]);
        
		return parseFloat(
            ("" + value)
            .replace(/\((?=\d+)(.*)\)/, "-$1")
            .replace(regex, '')
            .replace(decimal, '.')
        );
    },

    amount: function (value, targetData, newData) {
        targetData.total = value * this._unformatPrice(newData.price);

        return value;
    },

    price: function (value) {
        return this._formatPrice(value);
    },

    total: function (value) {
        return this._formatPrice(value);
    }
}