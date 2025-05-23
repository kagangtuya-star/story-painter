export * from './types';
// export * from './helpers';

/**
* Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
* 
* @param {String} text The text to be rendered.
* @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
* 
* @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
*/
export function getTextWidth(text: string, font: string): any {
  // re-use canvas object for better performance
  const canvas = (getTextWidth as any).canvas || ((getTextWidth as any).canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

function getCssStyle(element: any, prop: any) {
  return window.getComputedStyle(element, null).getPropertyValue(prop);
}

export function getCanvasFontSize(el = document.body) {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

  return `${fontWeight} ${fontSize} ${fontFamily}`;
}

export function msgImageFormat(msg: string, options: any, htmlText = false) {
  // 替换图片、表情
  if (options.imageHide) {
    msg = msg.replaceAll(/\[CQ:(image|face)(,summary=\[动画表情\])?,[^\]]+\]/g, '')
  } else {
    if (htmlText) {
      // [CQ:image,summary=[动画表情],...,file_unique=...]
      msg = msg.replaceAll(/\[CQ:image(,summary=\[动画表情\])?,[^\]]+?file_unique=([a-zA-Z0-9]{32})\]/g, '<img style="max-width: 300px" src="https://gchat.qpic.cn/gchatpic_new/0/0-0-$2/0?term=2" crossorigin="anonymous" />')
      // [CQ:image,summary=[动画表情],file=...,url=...]
      msg = msg.replaceAll(/\[CQ:image,summary=\[动画表情\],[^\]]+?url=([^\]]+)\]/g, '<img style="max-width: 300px" src="$1" />')
      // [CQ:image,file=...,url=...]
      msg = msg.replaceAll(/\[CQ:image,[^\]]+?url=([^\]]+)\]/g, '<img style="max-width: 300px" src="$1" />')
      // [CQ:image,file=https?://...]
      msg = msg.replaceAll(/\[CQ:image,file=(https?:\/\/[^\]]+)\]/g, '<img style="max-width: 300px" src="$1" />')
      // [CQ:image,file=725BAB58A963A84E1A3BO1F3FCA7F1DF.jpg]
      msg = msg.replaceAll(/\[CQ:image,file=([A-Za-z0-9]{32,64})(\.[a-zA-Z]+?)\]/g, '<img style="max-width: 300px" src="https://gchat.qpic.cn/gchatpic_new/0/0-0-$1/0?term=2,subType=1" />')
      // [CQ:image,file=file://C:/UsersAdministrator/Documents/Tencent Files/123/nt_gq/nt_datalPic\2024-03\Ori\53160996bad0f318aef05dfd82cc7f53.jpg]
      msg = msg.replaceAll(/\[CQ:image,file=file:\/\/[^\]]+([A-Za-z0-9]{32})(\.[a-zA-Z]+?)\]/g, (m, p1) => {
        return `<img style="max-width: 300px" src="https://gchat.qpic.cn/gchatpic_new/0/0-0-${p1.toUpperCase()}/0?term=2,subType=1" />`
      })
      msg = msg.replaceAll(/\[CQ:image,file=\{([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)}([^\]]+?)\]/g, '<img style="max-width: 300px" src="https://gchat.qpic.cn/gchatpic_new/0/0-0-$1$2$3$4$5/0?term=2" />')
    }
  }

  if (options.imageHide) {
    msg = msg.replaceAll(/\[mirai:(image|marketface):[^\]]+\]/g, '')
  } else {
    if (htmlText) {
      msg = msg.replaceAll(/\[mirai:image:\{([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)}([^\]]+?)\]/g, '<img style="max-width: 300px" src="https://gchat.qpic.cn/gchatpic_new/0/0-0-$1$2$3$4$5/0?term=2" />')
    }
  }

  if (options.imageHide) {
    msg = msg.replaceAll(/\[(image|图):[^\]]+\]/g, '')
  } else {
    if (htmlText) {
      msg = msg.replaceAll(/\[(?:image|图):([^\]]+)?([^\]]+)\]/g, '<img style="max-width: 300px" src="$1" />')
    }
  }

  return msg;
}

export function msgOffTopicFormat(msg: string, options: any, isDice = false) {
  // 替换场外发言
  if (options.offTopicHide && (!isDice)) {
    msg = msg.replaceAll(/^\s*(?:@\S+\s+)*[（\(].*/gm, "");
  }
  return msg;
}

export function msgCommandFormat(msg: string, options: any) {
  // 替换指令
  if (options.commandHide) {
    msg = msg.replaceAll(/^[\.。\/](?![\.。\/])(.|\n)*$/g, '')
  }
  return msg;
}

// TODO: 名字不贴切，这个是一个收尾替换
export function msgIMUseridFormat(msg: string, options: any, isDice = false) {
  // 替换残留QQ号
  if (options.userIdHide) {
    // for (let i of allUserIds) {
    //   msg = msg.replaceAll(`(${i})`, '')
    // }
  }
  
  if (isDice) {
    // 替换角色的<>
    msg = msg.replaceAll('<', '')
    msg = msg.replaceAll('>', '')
  }

  // 过滤其他任何CQ码，除了at与image
  msg = msg.replaceAll(/\[CQ:(?!image|at).+?,[^\]]+\]/g, "");
  // 过滤mirai
  msg = msg.replaceAll(/\[mirai:(?!image).+?:[^\]]+\]/g, '')

  // 这个trim是消灭单行空白，例如“@xxxx\nXXXX”虽然还是会造成中间断行，但先不管
  msg = msg.trim();

  return msg;
}

// 替换将回复或@的格式，在染色后的日志中呈现为@对应的玩家名称
// 在其他平台，回复消息的日志类型也有所不同。
// QQ的回复是CQ码 [CQ:at,qq=12345678]
// discord的回复是 <@8181007086111111>
// kook的回复是 (met)176031111(met)
export function msgAtFormat(msg: string, pcList: any) {
  // qq的回复会给出两个连续的相同CQ码，如[CQ:at,qq=123456] [CQ:at,qq=123456]，预先处理只保留一个
  let qqReplyPattern = new RegExp(
    `(\\[CQ:at,qq=([0-9]+)\\]) \\[CQ:at,qq=([0-9]+)\\]`,
    "g"
  );
  if (msg.match(qqReplyPattern)) {
    const match = msg.match(qqReplyPattern);
    if (match) {
      msg = msg.replace(qqReplyPattern, "$1");
    }
  }

  for (let i of pcList) {
    // QQ的回复是CQ码 [CQ:at,qq=12345678]
    let qqAtPattern = new RegExp(`\\[CQ:at,qq=${i.IMUserId}\\]`, "g");
    msg = msg.replace(qqAtPattern, `@${i.name}`);

    // discord的回复是 <@8181007086111111>
    let discordAtPattern = new RegExp(`&lt;@${i.IMUserId}&gt;`, "g");
    msg = msg.replace(discordAtPattern, `@${i.name}`);

    // kook的回复是 (met)17603111(met)
    let kookAtPattern = new RegExp(`\\(met\\)${i.IMUserId}\\(met\\)`, "g");
    msg = msg.replace(kookAtPattern, `@${i.name}`);
  }
  return msg;
}

export function escapeHTML(html: string) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(html));
  return div.innerHTML;
}
