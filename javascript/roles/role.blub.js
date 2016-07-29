var Creep = require('class.creep');
function RoleBlub() {
    Creep.call(this);
    this.getBody = function(s) {
        return false;
    }
    this.role = 'blub';
    this.maxCreeps = 0;
};
RoleBlub.prototype = _.create(Creep.prototype, {
    'constructor': RoleBlub
});
module.exports = RoleBlub;