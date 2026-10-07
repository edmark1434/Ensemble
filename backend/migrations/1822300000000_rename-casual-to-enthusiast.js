exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        UPDATE platform_purpose 
        SET purpose_name = 'Enthusiast' 
        WHERE purpose_name = 'Casual';
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        UPDATE platform_purpose 
        SET purpose_name = 'Casual' 
        WHERE purpose_name = 'Enthusiast';
    `);
};
