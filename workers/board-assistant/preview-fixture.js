/** Defines the only server-approved synthetic corpus for the owner pilot; never runtime user data. */
export const previewFixture = {
  publicCoverage: { complete: true },
  sections: [
    { id: 'science', title: 'Khám phá · DỮ LIỆU GIẢ' },
    { id: 'craft', title: 'Thực hành · DỮ LIỆU GIẢ' },
    { id: 'notice', title: 'Thông báo · DỮ LIỆU GIẢ' },
  ],
  posts: [
    {
      id: 'lesson',
      section_id: 'science',
      title: 'Lực đẩy trong nước',
      body: 'Vật trong nước chịu lực đẩy hướng từ dưới lên. Lực này giúp giải thích vật nổi.',
      status: 'published',
      attachments: [],
    },
    {
      id: 'fold',
      section_id: 'craft',
      title: 'Nếp gấp sao giấy',
      body: 'Hướng dẫn gấp sao giấy: gấp mép theo đường chéo rồi miết phẳng. Dùng giấy tái chế sạch.',
      status: 'published',
      attachments: [],
    },
    {
      id: 'notice',
      section_id: 'notice',
      title: 'Xưởng mô hình giấy',
      body: 'Xưởng mô hình giấy dành cho nhóm thực hành A. Hoạt động diễn ra ngày 20/11/2026 tại sân mô phỏng. Cần mang giấy tái chế và bút màu.',
      status: 'published',
      attachments: [],
    },
    {
      id: 'update',
      section_id: 'notice',
      title: 'Điều chỉnh Xưởng mô hình giấy',
      body: 'Thay đổi lịch Xưởng mô hình giấy: hoạt động chuyển sang diễn ra ngày 22/11/2026 tại sân mô phỏng. Thông báo này thay thế lịch 20/11/2026. Vật dụng vẫn là giấy tái chế và bút màu.',
      status: 'published',
      attachments: [],
    },
  ],
};
