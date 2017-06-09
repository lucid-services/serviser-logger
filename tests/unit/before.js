before(function() {
    this.dateToISOString = dateToISOString;

    function dateToISOString(date) {
        date = new Date(date);
        function pad(number) {
            if (number < 10) {
                return '0' + number;
            }
            return number;
        }

        return (date.getUTCFullYear() + '').substr(2) +
            '-' + pad(date.getUTCMonth() + 1) +
            '-' + pad(date.getUTCDate());
    }
});
