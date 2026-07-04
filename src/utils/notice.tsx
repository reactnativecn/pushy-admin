// import { Modal } from 'antd';
// import i18n from '@/i18n';

// const { confirm } = Modal;

// type NoticeKey = 'v8-deprecation';

// const buildNotice = (key: NoticeKey) => {
//   const t = i18n.t.bind(i18n);
//   if (key === 'v8-deprecation') {
//     return {
//       title: t('notice.v8_deprecation_title'),
//       content: (
//         <>
//           <p>
//             {t('notice.v8_deprecation_p1_before')}
//             <span style={{ color: 'var(--ant-color-error)' }}>
//               {t('notice.v8_deprecation_date')}
//             </span>
//             {t('notice.v8_deprecation_p1_after')}
//           </p>
//           <p>{t('notice.v8_deprecation_p2')}</p>
//           <p>{t('notice.v8_deprecation_p3')}</p>
//           <p>{t('notice.v8_deprecation_p4')}</p>
//         </>
//       ),
//       okText: t('notice.ok'),
//       cancelText: t('notice.dont_show_again'),
//       onCancel: () => {
//         localStorage.setItem(key, '1');
//       },
//     };
//   }
//   return null;
// };

/**
 * 显示尚未被用户关闭（"不再显示"）的公告。
 * 显式调用，避免 import 即弹窗的副作用。
 */
export function showNotices() {
  // (['v8-deprecation'] as NoticeKey[]).forEach((key) => {
  //   if (localStorage.getItem(key)) {
  //     return;
  //   }
  //   const notice = buildNotice(key);
  //   if (notice) {
  //     confirm(notice);
  //   }
  // });
}
