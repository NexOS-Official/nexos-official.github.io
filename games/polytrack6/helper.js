const MathUtils = {

    formatForUI: function(value, decimals = 2) {
        return Number(value).toFixed(decimals);
    },

    areEqual: function(a, b) {
        return Math.abs(a - b) < Number.EPSILON;
    },
  
    round: function(value, precision = 4) {
        const factor = Math.pow(10, precision);
        return Math.round(value * factor) / factor;
    }
};
