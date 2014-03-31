'use strict';
/*jshint -W086 */
/*jshint -W040 */

var utils       = require('./utils'),
    slice       = utils.slice,
    parsePart   = utils.parsePart,
    getParts    = utils.getParts;

//recursively freeze object of a hierarchy
function recursiveFreeze(value) {
    if (!value || typeof value !== 'object') {
        return value;
    }
    if (Object.isFrozen(value)) {
        return value;
    }
    Object.keys(value).forEach(function (key) {
        recursiveFreeze(value[key]);
    });
    return value;
}

// create a copy of the object with value substitued at the given property chain
function updateFrozenObject(object, parts, value, isPush) {
    if (!object || typeof object !== 'object') {
        return object;
    }
    var updatedProperty = parts.shift();
    var result = Object.keys(object).reduce(function (result, property) {
        var oldValue = object[property];
        if (updatedProperty === parsePart(property)) {
            if (parts.length === 0) {
                if (isPush) {
                    var newValue = oldValue ? slice(oldValue) : [];
                    newValue.push(value);
                    result[property] = newValue;
                } else {
                    result[property] = value;
                }
            } else {
                result[property] = updateFrozenObject(oldValue, parts, value, isPush);
            }
        } else {
            result[property] = oldValue;
        }
        return result;
    }, Array.isArray(object) ? [] : {});
    
    if (!result.hasOwnProperty(updatedProperty)) {
        result[updatedProperty] = parts.reduceRight(function (value, property) {
            var result = {};
            result[property] = value;
            return result;
        }, isPush? [value] : value);
    }
    
    return result;
}

//create a copy of the object with property deleted at the given property chain
function deleteFromFrozenObject(object, parts, isSplice, splicedIndex) {
    if (!object || typeof object !== 'object') {
        return object;
    }
    var updatedProperty = parts.shift();
    var result = Object.keys(object).reduce(function (result, property) {
        if (updatedProperty === property) {
            if (parts.length !== 0) {
                result[property] = deleteFromFrozenObject(object[property], parts, isSplice, splicedIndex);
            } else if (isSplice) {
                result[property] = object[property].filter(function (value, index) {
                    return index !== splicedIndex;
                });
            }
        } else {
            result[property] = object[property];
        }
        return result;
    }, Array.isArray(object) ? [] : {});
    
    return result;
}



/**
 * Retrieve a value from a view, and call the callback with the retrieved value,
 * the callback will be called each times the value is updated
 */
function bind(callback) {
    var view = this,
        value, valueIsSet = false, 
        changes = [];
    
    function dispose() {
        view.removeChangeListener(changeListener);
    }
    
    
    //set the value and call tge callback
    function setValue(data) {
        value = recursiveFreeze(data);
        callback(null, value);
    }
    
    //retrive the value from the server
    function retrieveValue() {
        valueIsSet = false;
        changes = [];
        view.value(function (err, data) {
            if (err) {
                callback(err);
                dispose();
                return;
            }
            setValue(data);
            valueIsSet = true;
            deQueuChange();
        });
    }
    retrieveValue();
    
    //handle view changes
    function deQueuChange() {
        if (valueIsSet) {
            changes.every(function (changeRecord) {
                var changeParts = getParts(changeRecord.path),
                    viewParts   = getParts(view.path),
                    diff, 
                    newValue;
                
                if (changeParts.length < viewParts.length) {
                    //A Change occured higher in the hiearchy
                    diff = viewParts.slice(changeParts.length);
                    switch (changeRecord.type) {
                        case 'set':
                            // we just retrieve the new value in the property hiearchy
                            newValue = diff.reduce(function (value, property) {
                                return  value && typeof value === 'object' ? value[property] : undefined;
                            }, changeRecord.data);
                            break;
                        case 'splice': 
                            // in this case if the splice occured at our array index in the path or after we need to refetch the data
                            if (changeRecord.index >= diff[0]) {
                                retrieveValue();
                                //we also does not need to look at changes anymore since we will retrive a new value
                                return false;
                            }
                        case 'delete': 
                            newValue = undefined;
                            break;
                        default: 
                            //other case does not matters we jump to the new change
                            return true;
                    }
                } else if (changeParts.length === viewParts.length) {
                    // A change occured exactly at our path
                    switch (changeRecord.type) {
                        case 'set':
                            //the new value is simply the seted value
                            newValue = changeRecord.data;
                            break;
                        case 'push':
                            //simply add the new value to our array
                            newValue = value ? slice(value) : [];
                            newValue.push(changeRecord.data);
                            break;
                        case 'splice':
                            //remove the index from the new value
                            newValue = value.filter(function (data, index) {
                                return index !== changeRecord.index;
                            });
                        // with delete newValue will be set to 'undefined' wich is exactly what we want
                    }
                } else  {
                    // finally this mean that a change occured on a child of our value
                    diff = changeParts.slice(viewParts.length);
                    switch (changeRecord.type) {
                        case 'set':
                            //update the object child with the new value of the node
                            newValue = updateFrozenObject(value, diff, changeRecord.data);
                            break;
                        case 'delete':
                            //delete the property at the right node
                            newValue = deleteFromFrozenObject(value, diff);
                            break;
                        case 'push':
                            //add the newValue to our array at the right node
                            newValue = updateFrozenObject(value, diff, changeRecord.data, true);
                            break;
                        case 'splice':
                            //delete from our value the right index
                            newValue = deleteFromFrozenObject(value, diff, true, changeRecord.index);
                            break;
                    }
                }
                // set the obtained value as value
                setValue(newValue);
                return true;
            });
            changes = [];
        }
    }
    
    //view change listener
    function changeListener(changeRecord) {
        changes.push(changeRecord);
        deQueuChange();
    }
    
    view.addChangeListener(changeListener);
    
    return {
        dispose: dispose
    };
}

module.exports = bind;