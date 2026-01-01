import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token, cx }, withBackground: boolean) => ({
  background: css`
    padding: 24px;

    background-color: ${token.colorBgLayout};
    background-image: 'https://lobechat.com/images/screenshot_background.webp';
    background-position: center;
    background-size: 120% 120%;
  `,
  container: cx(
    withBackground &&
      css`
        overflow: hidden;
        border: 2px solid ${token.colorBorder};
        border-radius: ${token.borderRadiusLG}px;
      `,

    css`
      background: ${token.colorBgLayout};
    `,
  ),
  footer: css`
    padding: 16px;
    border-block-start: 1px solid ${token.colorBorder};
  `,
  header: css`
    margin-block-end: -24px;
    padding: 16px;
    border-block-end: 1px solid ${token.colorBorder};
    background: ${token.colorBgContainer};
  `,
  role: css`
    margin-block-start: 12px;
    padding-block-start: 12px;
    border-block-start: 1px dashed ${token.colorBorderSecondary};
    opacity: 0.75;

    * {
      font-size: 12px !important;
    }
  `,
  url: css`
    color: ${token.colorTextDescription};
  `,
  mainTitle: css`
    font-size: 24px;
    font-weight: 500;
    color: #111827;
    margin-left: -58px;
  `,

  logoIcon: css`
    width: 36px;
    height: 36px;
    margin-right: 12px;
    border-radius: 8px;
  `,
}));
