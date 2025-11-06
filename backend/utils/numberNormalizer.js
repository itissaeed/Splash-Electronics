const normalizeBangladeshNumber = (input) => {
    // Controller and Model now share this exact logic.
    let num = (input || '').toString().replace(/\D/g, ''); // Remove non-digits
    if (num.startsWith('880')) num = num.slice(3); // Remove +880
    else if (num.startsWith('88')) num = num.slice(2); // Remove 88
    else if (num.startsWith('0')) num = num.slice(1); // Remove leading 0
    
    // Check for 10 digits starting with '1' (Bangladesh mobile standard)
    if (num.length === 10 && num.startsWith('1')) {
        return '+880' + num;
    }
    
    return null; // Invalid format
};

// Error message constant for reuse
const VALIDATION_ERROR = 'Invalid Bangladeshi phone number. Expected formats: 01XXXXXXXXX, +8801XXXXXXXXX, or 8801XXXXXXXXX';

module.exports = {
    normalizeBangladeshNumber,
    VALIDATION_ERROR
};