<template>
  <n-layout>
    <n-layout-header class="bg-slate-100 dark:bg-inherit">
      <n-flex class="py-3 text-2xl" size="large" align="center" justify="center" wrap>
        <n-flex align="center" justify="center">
          <strong>海豹TRPG跑团Log着色器</strong>
          <n-tag type="success" size="small" :bordered="false">v2.5.2</n-tag>
        </n-flex>
        <n-flex align="center" justify="center">
          <n-icon>
            <a href="https://github.com/sealdice/story-painter" target="_blank">
              <logo-github/>
            </a>
          </n-icon>
          <n-button type="primary" @click="backV1">官网</n-button>
        </n-flex>
      </n-flex>
    </n-layout-header>
    <n-layout-content class="bg-slate-100 dark:bg-inherit">
      <div style="width: 1000px; margin: 0 auto; max-width: 100%; padding-bottom: 3rem">
        <n-text type="info" italic class="block text-center my-1">SealDice骰QQ群 524364253 [群介绍中有其余3群]</n-text>
        <option-view></option-view>
        <n-spin :show="loading">
          <template #description>
            正在试图加载远程记录……
          </template>
          <div class="pc-list">
            <div v-for="(i, index) in store.pcList">
              <div style="display: flex; align-items: center; width: 26rem;">
                <n-button type="error" size="small" secondary style="padding: 0 1rem " @click="deletePc(index, i)"
                          :disabled="isShowPreview || isShowPreviewBBS || isShowPreviewTRG">
                  <template #icon>
                    <n-icon>
                      <icon-delete></icon-delete>
                    </n-icon>
                  </template>
                  <span v-if="notMobile">删除</span>
                </n-button>

                <n-input :disabled="isShowPreview || isShowPreviewBBS || isShowPreviewTRG" v-model:value="i.name"
                         class="w-50 m-2"
                         :prefix-icon="User" @focus="nameFocus(i)" @change="nameChanged(i)"/>

                <n-input :disabled="true" v-model:value="i.IMUserId" style="width: 24rem"/>

                <n-select v-model:value="i.role" class="m-2 w-60" style="width: 24rem"
                          :options="[{value: '主持人', label: '主持人'}, {value: '角色', label: '角色'}, {value: '骰子', label: '骰子'}, {value: '隐藏', label: '隐藏'}]"/>

                <n-color-picker v-model:value="i.color" :show-alpha="false" show-preview
                                :swatches="colors"
                                :on-update:value="(v) => colorChanged(v, i)"/>
              </div>
            </div>
          </div>

          <n-flex size="small" justify="center" align="center" class="my-4">
            <n-flex size="small" justify="center" align="center" class="mr-2">
              <n-button secondary type="primary" @click="exportRecordRaw">下载原始文件</n-button>
              <!-- <n-button secondary type="primary" v-show="false" @click="exportRecordQQ">下载QQ风格记录</n-button>-->
              <!-- <n-button secondary type="primary" v-show="false" @click="exportRecordIRC">下载IRC风格记录</n-button>-->
              <n-button secondary type="primary" @click="exportRecordDOC">下载Word</n-button>
              <n-button secondary type="primary" @click="exportRecordTalkDOC">下载对话Word</n-button>
            </n-flex>
            <!-- <n-button @click="showPreview">预览</n-button> -->
            <div>
              <n-checkbox label="预览" v-model:checked="isShowPreview" :border="true"
                          @click="previewClick('preview')"/>
              <n-checkbox label="论坛代码" v-model:checked="isShowPreviewBBS" :border="true"
                          @click="previewClick('bbs')"/>
              <n-checkbox label="回声工坊" v-model:checked="isShowPreviewTRG" :border="true"
                          @click="previewClick('trg')"/>
            </div>
            <n-divider vertical/>
            <div>
              <n-tooltip class="box-item" placement="top-start">
                <template #trigger>
                  <n-button type="primary" text @click="refreshColors">刷新色板</n-button>
                </template>
                重新随机生成上方颜色选择中的预置颜色
              </n-tooltip>
            </div>
          </n-flex>

          <code-mirror v-show="!(isShowPreview || isShowPreviewBBS || isShowPreviewTRG)" ref="editor"
                       class="mt-4"
                       @change="onChange">
            <div class="z-50 absolute right-2 flex flex-col items-center">
              <div class="">
                <n-button secondary @click="clearText" id="btnCopyPreviewBBS" type="primary" class="w-full">清空内容
                </n-button>
              </div>
              <div class="mt-1">
                <n-button secondary @click="doFlush" type="primary" class="w-full">强制刷新</n-button>
              </div>
              <div class="mt-1">
                <n-checkbox label="编辑器染色" v-model:checked="store.doEditorHighlight" :border="false" class="w-full"
                            @click.native="doEditorHighlightClick($event)"/>
              </div>
            </div>
          </code-mirror>

          <n-message-provider>
            <preview-main :is-show="isShowPreview" :preview-items="previewItems"></preview-main>
            <preview-bbs :is-show="isShowPreviewBBS" :preview-items="previewItems"></preview-bbs>
            <preview-trg :is-show="isShowPreviewTRG" :preview-items="previewItems"></preview-trg>
          </n-message-provider>
        </n-spin>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { nextTick, ref, onMounted, watch, h, render, renderList, computed } from "vue";
import { useStore } from './store'
import CodeMirror from './components/CodeMirror.vue'
import { debounce, delay } from 'lodash-es'
import { exportFileRaw, exportFileQQ, exportFileIRC, exportFileDoc } from "./utils/exporter";
import { strFromU8, unzlibSync } from 'fflate';
import uaParser from 'ua-parser-js'

import { logMan } from './logManager/logManager'
import { ViewUpdate } from "@codemirror/view";
import { TextInfo } from "./logManager/importers/_logImpoter";
import previewMain from "./components/previews/preview-main.vue";
import previewBbs from "./components/previews/preview-bbs.vue";
import previewTrg from "./components/previews/preview-trg.vue";
import PreviewItem from './components/previews/preview-main-item.vue'
import PreviewTableTR from './components/previews/preview-table-tr.vue'
import { LogItem, CharItem, packNameId } from "./logManager/types";
import { setCharInfo } from './logManager/importers/_logImpoter'
import { msgCommandFormat, msgImageFormat, msgIMUseridFormat, msgOffTopicFormat, msgAtFormat } from "./utils";
import { NButton, NText, useMessage, useModal, useNotification } from "naive-ui";
import { User, LogoGithub, Delete as IconDelete } from '@vicons/carbon'
import { breakpointsTailwind, useBreakpoints, useDark, useToggle } from '@vueuse/core'
import OptionView from "./components/OptionView.vue";
import randomColor from "randomcolor";

import { parquetReadObjects } from 'hyparquet'
import { asyncBufferFrom } from 'hyperparam'
import { compressors } from 'hyparquet-compressors'


const breakpoints = useBreakpoints(breakpointsTailwind)
const notMobile = breakpoints.greater('sm')

const isDark = useDark()
const toggleDark = useToggle(isDark)

// 不用他了 虽然很不错，但是没有屏幕取色
// import { ColorPicker } from 'vue-color-kit'
// import 'vue-color-kit/dist/vue-color-kit.css'

const message = useMessage()
const modal = useModal()
const notification = useNotification()

const loading = ref<boolean>(false)

const isMobile = ref(false)
const downloadUsableRank = ref(0)

const isShowPreview = ref(false)
const isShowPreviewBBS = ref(false)
const isShowPreviewTRG = ref(false)

const colors = ref<string[]>([])
const refreshColors = () => {
  colors.value = randomColor({ count: 16 })
  message.success("色板刷新成功！", { duration: 800 })
}

const colorChanged = debounce((v: string, i: CharItem) => {
  i.color = v
  store.pcNameColorMap.set(i.name, v)
  store.colorMapSave();
}, 300)

const backV1 = () => {
  // location.href = location.origin + '/v1/' + location.search + location.hash;
  location.href = 'https://dice.weizaima.com';
}

// 清空文本
const clearText = () => {
  store.editor.dispatch({
    changes: { from: 0, to: store.editor.state.doc.length, insert: '' }
  })
}

const doFlush = () => {
  console.log('flush')
  logMan.flush();
}

const previewClick = (mode: 'preview' | 'bbs' | 'trg') => {
  switch (mode) {
    case 'preview':
      isShowPreviewBBS.value = false
      isShowPreviewTRG.value = false
      break;
    case 'bbs':
      isShowPreview.value = false
      isShowPreviewTRG.value = false
      store.exportOptions.imageHide = true
      break;
    case 'trg':
      isShowPreview.value = false
      isShowPreviewBBS.value = false
      store.exportOptions.imageHide = true
      break;
  }
  showPreview();
}

function setupUA() {
  const parser = new uaParser.UAParser()
  parser.setUA(navigator.userAgent)
  const deviceType = parser.getDevice()

  const browser = parser.getBrowser().name
  downloadUsableRank.value = 1

  isMobile.value = deviceType.type === 'mobile'
  if (deviceType.type === 'mobile') {
    // 经测可以使用的
    switch (browser) {
        // case '360 Browser': // 手机360 但是手机360无特征，自己是Chrome WebView
        // 手机:X浏览器 Chrome WebView无特征
      case 'Edge':
      case 'Chrome':
      case 'Chromium':
      case 'Firefox':
      case 'MIUI Browser':
      case 'Opera':
        downloadUsableRank.value = 2
    }

    // 经测无法使用的
    switch (browser) {
      case 'baiduboxapp': // 手机:百度浏览器
      case 'QQBrowser': // 手机:搜狗浏览器极速版，手机:QQ浏览器
        // 手机:万能浏览器，Chrome WebView无特征，会直接崩溃
      case 'UCBrowser': // 手机:UC浏览器
      case 'Quark': // 手机:夸克
        // 手机:Via浏览器，Chrome WebView无特征，会直接崩溃
      case 'QQ': // 手机:QQ
      case 'WeChat':
        downloadUsableRank.value = 0
    }
  }
}

setupUA()

const browserAlert = () => {
  if (downloadUsableRank.value === 0) {
    message.warning('你目前所使用的浏览器无法下载文件，请更换对标准支持较好的浏览器。建议使用Chrome/Firefox/Edge')
  }
  if (downloadUsableRank.value === 1) {
    if (isMobile.value) {
      message.warning('你目前所使用的浏览器可能在下载文件时遇到乱码，或无法下载文件，最好更换对标准支持较好的浏览器。建议使用Chrome/Firefox/Edge')
    }
  }
  // 2 不做提示 因为兼容良好
}

onMounted(async () => {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop as any)
  })
  const key = (params as any).key
  const password = location.hash.slice(1)

  const showHl = () => {
    setTimeout(() => {
      if (!isMobile.value) {
        store.doEditorHighlight = true
        store.reloadEditor()
      }
    }, 1000)
  }

  if (key && password) {
    loading.value = true
    try {
      const record = await store.tryFetchLog(key, password) as {
        client: 'SealDice' | 'Parquet',
        created_at: string,
        data: string,
        name: string,
        note: string,
        updated_at: string,
      }

      switch(record.client) {
        case 'Parquet' : {
          const uint8 = Uint8Array.from(atob(record.data), c => c.charCodeAt(0))
          const asyncBuffer = await asyncBufferFrom({file: new File([uint8],'default'),byteLength:uint8.byteLength})
          const res = await parquetReadObjects({
            file:asyncBuffer,
            compressors,
          })
          nextTick(() => {
            const text = JSON.stringify({
              items: res.map(v => {
                v.id = Number(v.id)
                v.time = Number(v.time)
                v.commandId = Number(v.commandId)
                return v
              }),
              version: 105
            })
            store.pcList.length = 0
    
            logMan.lastText = '';
            logMan.syncChange(text, [0, store.editor.state.doc.length], [0, text.length])
          });
        }
        break
        case 'SealDice': 
        default:
        {
          const log = unzlibSync(Uint8Array.from(atob(record.data), c => c.charCodeAt(0)));

          nextTick(() => {
            const text = strFromU8(log)
            store.pcList.length = 0
    
            logMan.lastText = '';
            logMan.syncChange(text, [0, store.editor.state.doc.length], [0, text.length])

          });
        }
        break
      }


      loading.value = false
      showHl()
    } catch (e) {
      console.log(e)
      notification['error']({
        content: '错误',
        meta: '加载日志失败，可能是序号或密码不正确',
        duration: 5000
      })
      loading.value = false
      browserAlert()
      return true
    }
  } else {
    store.editor.dispatch({
      changes: { from: 0, to: store.editor.state.doc.length, insert: store.editor.state.doc.toString() }
    })
    showHl()
  }

  // cminstance.value = cmRefDom.value?.cminstance;
  // cminstance.value?.focus();
  // console.log(cminstance.value)
  colors.value = randomColor({ count: 16 })
  browserAlert()
  await nextTick(() => {
    setTimeout(() => {
      doFlush()
    }, 3000)
  })
});

function exportRecordRaw() {
  browserAlert()
  exportFileRaw(store.editor.state.doc.toString())
}

function exportRecordQQ() {
  browserAlert()
  showPreview()
  exportFileQQ(previewItems.value, store.exportOptions)
}

function exportRecordIRC() {
  browserAlert()
  showPreview()
  exportFileIRC(previewItems.value, store.exportOptions)
}

function exportRecordDOC() {
  browserAlert()
  if (isMobile.value) {
    message.warning('你当前处于移动端环境，已知只有WPS能够查看生成的Word文件，且无法看图！使用PC打开可以查看图片。')
  }

  const solveImg = (el: Element) => {
    if (el.tagName === 'IMG') {
      let width = el.clientWidth;
      let height = el.clientHeight;
      if (width === 0) {
        width = 300;
        height = 300;
      }
      el.setAttribute('width', `${width}`)
      el.setAttribute('height', `${height}`)
    }
    for (let i = 0; i < el.children.length; i += 1) {
      solveImg(el.children[i])
    }
  }

  const map = store.pcMap;
  const el = document.createElement('span');
  const elRoot = document.createElement('div');
  const items = [];

  showPreview()
  for (let i of previewItems.value) {
    if (i.isRaw) continue;
    const id = packNameId(i);
    if (map.get(id)?.role === '隐藏') continue;

    const html = h(PreviewItem, { source: i });
    render(html, el);

    const c = el;
    solveImg(c);
    items.push(c.innerHTML);
  }

  exportFileDoc(items.join('\n'));
}

function exportRecordTalkDOC() {
  browserAlert()
  if (isMobile.value) {
    message.warning('你当前处于移动端环境，已知只有WPS能够查看生成的Word文件，且无法看图！使用PC打开可以查看图片。')
  }

  const solveImg = (el: Element) => {
    if (el.tagName === 'IMG') {
      let width = el.clientWidth;
      let height = el.clientHeight;
      if (width === 0) {
        width = 300;
        height = 300;
      }
      el.setAttribute('width', `${width}`)
      el.setAttribute('height', `${height}`)
    }
    for (let i = 0; i < el.children.length; i += 1) {
      solveImg(el.children[i])
    }
  }

  const map = store.pcMap;
  const el = document.createElement('span');
  const elRoot = document.createElement('div');
  const items = [];

  showPreview()
  for (let i of previewItems.value) {
    if (i.isRaw) continue;
    const id = packNameId(i);
    if (map.get(id)?.role === '隐藏') continue;

    const html = h(PreviewTableTR, { source: i });
    render(html, el);

    const c = el;
    solveImg(c);
    items.push(c.innerHTML);
  }
  exportFileDoc(`<table style="border-collapse: collapse;"><tbody>${items.join('\n')}</tbody></table>`);
}


const previewItems = ref<LogItem[]>([])

function showPreview() {
  let tmp = []
  let index = 0;
  const offTopicHide = store.exportOptions.offTopicHide;
  console.log('当前日志条目数量: ', logMan.curItems.length)

  for (let i of logMan.curItems) {
    if (i.isRaw) continue;

    // // 处理ot
    // if (offTopicHide && !i.isDice) {
    //   const msg = i.message.replaceAll(/^[(（].+?$/gm, '') // 【
    //   if (msg.trim() === '') continue;
    // }
    let msg = msgImageFormat(i.message, store.exportOptions);
    msg = msgAtFormat(msg, store.pcList);
    msg = msgOffTopicFormat(msg, store.exportOptions, i.isDice);
    msg = msgCommandFormat(msg, store.exportOptions);
    msg = msgIMUseridFormat(msg, store.exportOptions, i.isDice);
    msg = msgOffTopicFormat(msg, store.exportOptions, i.isDice); // 再过滤一次
    if (msg.trim() === '') continue;

    i.index = index;
    tmp.push(i);
    index += 1;
  }
  previewItems.value = tmp;
}

const store = useStore()
store.colorMapLoad();

// 修改ot选项后重建items
watch(() => store.exportOptions.offTopicHide, showPreview)

const editor = ref()
watch(isDark, () => {
  console.log('dark watch')
  store.reloadEditor()
})

const deletePc = (index: number, i: CharItem) => {
  const now = Date.now();
  if (now - lastNameChange < 100) return;
  lastNameChange = now;

  const m = modal.create({
    title: '删除角色',
    preset: 'card',
    style: {
      width: '30rem',
    },
    content: `即将删除角色「${i.name}」及其全部发言，确定吗？`,
    footer: () => [
      h(
          NButton,
          { type: 'default', onClick: () => m.destroy(), style: { marginRight: '1rem' } },
          () => '取消',
      ),
      h(
          NButton,
          {
            type: 'primary', onClick: () => {
              try {
                store.pcList.splice(index, 1);
                logMan.deleteByCharItem(i);
              } finally {
                m.destroy()
              }
            }
          },
          () => '确定'
      ),
    ]
  })
}

let lastPCName = ''

const nameFocus = (i: CharItem) => {
  lastPCName = i.name
}

let lastNameChange = 0;
const nameChanged = (i: CharItem) => {
  const now = Date.now();
  if (now - lastNameChange < 100) return;
  lastNameChange = now;

  const oldName = lastPCName; // 这样做的原因是，如果按回车确认，那么 nameFocus 会在promise触发前触发一遍导致无效
  const newName = i.name;
  if (oldName && newName) {
    const el = document.createElement('span');

    render(h('span', `${oldName}`), el);
    const name1 = el.innerHTML;

    render(h('span', `${newName}`), el);
    const name2 = el.innerHTML;

    render(h('span', `<${oldName}>`), el);
    const name1w = el.innerHTML;

    render(h('span', `<${newName}>`), el);
    const name2w = el.innerHTML;

    const m = modal.create({
      title: '名字变更',
      preset: 'card',
      style: {
        width: '30rem',
      },
      content: () => [
        h(
            NText,
            { innerHTML: `即将进行名字变更 <b>${name1} -> ${name2}</b><br />将修改信息行，并在文本中进行批量替换（${name1w} 替换为 ${name2w}），确定吗？` },
        ),
      ],
      footer: () => [
        h(
            NButton,
            { type: 'default', onClick: () => m.destroy(), style: { marginRight: '1rem' } },
            () => '取消',
        ),
        h(
            NButton,
            {
              type: 'primary', onClick: () => {
                try {
                  logMan.rename(i, oldName, newName)
                } catch (_e) {
                  i.name = oldName;
                } finally {
                  m.destroy()
                }
              }
            },
            () => '确定'
        ),
      ]
    })
  }
}


logMan.ev.on('textSet', (text) => {
  store.editor.dispatch({
    changes: { from: 0, to: store.editor.state.doc.length, insert: text }
  });

  let m = new Map<string, CharItem>();
  for (let i of logMan.curItems) {
    if (i.isRaw) continue;
    setCharInfo(m, i);
  }
  store.updatePcList(m);
});

logMan.ev.on('parsed', (ti: TextInfo) => {
  store.updatePcList(ti.charInfo);
})

const onChange = (v: ViewUpdate) => {
  let payloadText = '';
  if (v) {
    if (v.docChanged) {
      // 有一种我不太清楚的特殊情况会导致二次调用，从而使得pclist清零
      // 看不出明显变化，只是一个隐藏参数flags为0
      // 破案了，是flush
      if (!v.viewportChanged && (v as any).flags === 0) {
        return;
      }

      const ranges = (v as any).changedRanges;
      if (ranges.length) {
        for (let i = ranges.length - 1; i >= 0; i--) {
          const payloadText = store.editor.state.doc.toString()

          const r1 = [ranges[i].fromA, ranges[i].toA];
          const r2 = [ranges[i].fromB, ranges[i].toB];

          console.log('XXX', v, r1, r2);
          if (r1[0] === 0 && r1[1] === logMan.lastText.length) {
            console.log('全部文本被删除，清除pc列表');
            store.pcList = [];
          }
          logMan.syncChange(payloadText, r1, r2);
        }
      }
    }
  }

  // payloadText = store.editor.state.doc.toString()
  // let isLog = false
}

const doEditorHighlightClick = (e: any) => {
  // 因为原生click事件会执行两次，第一次在label标签上，第二次在input标签上，故此处理
  if (e.target.tagName === 'INPUT') return;

  const doHl = () => {
    // 编辑器染色
    setTimeout(() => {
      store.reloadEditor()
    }, 500)
  }

  if (store.doEditorHighlight) {
    // 如果要开启
    if (isMobile.value) {
      const m = modal.create({
        title: '开启编辑器染色？',
        preset: 'card',
        style: {
          width: '30rem',
        },
        content: '部分移动设备上的特定浏览器可能会因为兼容性问题而卡死，继续吗？',
        footer: () => [
          h(
              NButton,
              {
                type: 'default',
                onClick: () => {
                  store.doEditorHighlight = false
                  m.destroy()
                  setTimeout(() => {
                    doFlush()
                  }, 3000)
                },
                style: { marginRight: '1rem' }
              },
              () => '取消',
          ),
          h(
              NButton,
              {
                type: 'primary', onClick: () => {
                  try {
                    doHl()
                  } catch (_e) {
                    // 重新关闭
                    setTimeout(() => {
                      store.doEditorHighlight = false
                      store.reloadEditor()
                    }, 500)
                  } finally {
                    m.destroy()
                  }
                }
              },
              () => '确定'
          ),
        ]
      })

      return
    }
  }

  doHl()
}

const reloadFunc = () => {
  store.reloadEditor()
}
const pcList = computed(() => store.pcList)
watch(pcList, reloadFunc, { deep: true })

const exportOptions = computed(() => store.exportOptions)
watch(exportOptions, reloadFunc, { deep: true })

const code = ref("")

</script>

<style lang="scss">
.element-plus-logo {
  width: 50%;
}

.options > div {
  width: 30rem;
  max-width: 30rem;
  margin-bottom: 2rem;
}

.options > div > .switch {
  display: flex;
  align-items: center;
  justify-content: center;

  & > h4 {
    margin-top: 0rem;
    margin-bottom: 0rem;
    margin-left: 1rem;
  }
}

.myLineDecoration {
  // background: lightblue;
  margin-bottom: 20px;
  font-size: large;
}

.pc-list {
  display: flex;
  align-items: center;
  flex-direction: column;
}

#app {
  overflow-y: auto;
}

.preview {
  word-break: break-all;
  padding: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
  position: relative;
  // font-family: monospace;
}


.list-dynamic {
  width: 100%;
  height: 500px;
  overflow-y: auto;
}

.list-item-dynamic {
  // display: flex;
  // align-items: center;
  padding: 0.5em 0;
  border-color: lightgray;
}

.scroller {
  height: 95vh;
}
</style>