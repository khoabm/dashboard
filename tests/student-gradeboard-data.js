/** Public catalog metadata for finite synthetic QA; contains no student credentials or records. */
export function fixtureContext() {
  const project = (names) =>
    names.map((displayName, index) => ({
      code: `item_${index}`,
      displayName,
      sortOrder: index + 1,
      active: true,
    }));
  return {
    class: {
      name: 'Lớp mô phỏng',
      schoolYear: '2026–2027',
      semester1Published: true,
      semester2Published: false,
    },
    subjects: project(['Toán', 'Văn', 'Anh', 'KHTN', 'LS / ĐL', 'Công Nghệ', 'Tin Học', 'GDCD']),
    scoreColumns: project([
      'Thường xuyên 1',
      'Thường xuyên 2',
      'Thường xuyên 3',
      'Thường xuyên 4',
      '1 tiết',
      'Giữa kì',
      'Cuối kì',
    ]),
  };
}
