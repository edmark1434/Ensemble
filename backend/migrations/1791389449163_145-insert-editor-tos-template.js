exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO terms_of_service (terms_id, terms_title, terms_description, terms_type, is_default, account_id)
    VALUES (
      '00000000-0000-0000-0000-000000000003',
      'Standard Video Editing Terms',
      '1. Scope of Work: The Editor will provide video editing services based strictly on the storyline, script, or creative direction provided by the Client.\\n2. Source Material: The Client is responsible for providing all necessary raw footage, primary audio, and core brand assets. The Editor will not shoot or record original video footage.\\n3. Supplemental Media: The Editor may source and incorporate standard stock b-roll, sound effects, and music as needed to enhance the edit.\\n4. Revisions: Standard milestone revisions cover technical adjustments and pacing. Revisions do not cover completely new creative directions or storyline changes after the initial edit has begun.\\n5. Deliverables: Final deliverables will consist of the exported video files in the agreed format. Project files are only provided if explicitly stated.',
      'jobs',
      TRUE,
      NULL
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM terms_of_service WHERE terms_id = '00000000-0000-0000-0000-000000000003';
  `);
};
