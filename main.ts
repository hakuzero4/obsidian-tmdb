import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';
// Remember to rename these classes and interfaces!
import axios from "axios";

interface themoviedbSettings {
  apiKey: string;
  original_language: string;
  language: string;
  overview_length: number;
  folder_location: string;
}
// 默认值
const DEFAULT_SETTINGS: themoviedbSettings = {
  apiKey: '',
  original_language: '',
  language: 'zh',
  overview_length: 10,
  folder_location: '',
}


export default class MyPlugin extends Plugin {
  settings: themoviedbSettings;

  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: 'search Tv',
      name: '生成tmdb数据',
      checkCallback: (checking: boolean) => {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          if (!checking) {
            new ExampleModal(this.app, this).open();
          }
          return true;
        }
      },
    })
    this.addSettingTab(new SampleSettingTab(this.app, this));
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
export class ExampleModal extends SuggestModal<any> {
  plugin: MyPlugin;
  name: string;
  overview: string
  date: string
  img: string
  constructor(app: App, plugin: MyPlugin) {
    super(app);
    this.plugin = plugin
  }
  async getSuggestions(query: string) {
    if (!query) {
      return [];
    }
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${this.plugin.settings.apiKey}&language=${this.plugin.settings.language}&query=${query.toLocaleLowerCase()}`
    // const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=0f8506aab0fa109a7e1472f48f557e98&language=zh&query=${query.toLocaleLowerCase()}`)
    const response = await fetch(url)
    const result = await response.json()
    return result.results.filter((d: any) => {
      return d.media_type == 'tv' || d.media_type == 'movie'
    })
  }

  renderSuggestion(item: any, el: HTMLElement) {
    const name = item?.title || item?.name
    const date = item?.release_date || item?.first_air_date
    const overview = item?.overview.substring(0, this.plugin.settings.overview_length) || ''
    el.createEl("div", { text: `${name} - ${date}` });
    el.createEl("small", { text: overview });

  }

  async onChooseSuggestion(item: any, evt: MouseEvent | KeyboardEvent) {
    let saved: any, filedata:any
    const name = item?.title || item?.name
    const date = item?.release_date || item?.first_air_date
    const active_view =
      this.app.workspace.getActiveViewOfType(MarkdownView);


    // this.app.vault.adapter.list(this.app.vault.configDir).then(x=>console.log(x))
    try {
      if (item.poster_path) {
        filedata = await this.downloadImage(`https://image.tmdb.org/t/p/w500/${item.poster_path}`)
        saved = await this.app.vault.createBinary(`${this.plugin.settings.folder_location}${item.poster_path}`, filedata)
      }

    } catch (e) {
      console.log(e)
    } finally {
      const time = new Date()
      active_view?.editor.replaceRange(`
---
title: ${name}
date: ${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}
tags:
year: ${date}
type: ${item.media_type}
status: 
ep: 
cover: "![[${item?.poster_path.substr(1)}|80]]"
summary: ${item.overview.replaceAll('\n', '')}
---    
`, {
        line: 0,
        ch: 0
      })
    }


  }
  async downloadImage(url: string) {
    const res = await axios(url, { method: 'get', responseType: "arraybuffer" })
    return res.data
  }
}
// 插件设置页面
class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: '设置themoviedb' });
    new Setting(containerEl)
      .setName('Api Key')
      .setDesc('输入申请的api key')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          console.log('Secret: ' + value);
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName('语言')
      .setDesc('输入需要显示的语言')
      .addText(text => text
        .setPlaceholder('输入显示语言的')
        .setValue(this.plugin.settings.language)
        .onChange(async (value) => {
          console.log('Secret: ' + value);
          this.plugin.settings.language = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName('保存路径')
      .setDesc('设置封面保存纹路')
      .addText(text => text
        .setPlaceholder('设置封面保存纹路')
        .setValue(this.plugin.settings.folder_location)
        .onChange(async (value) => {
          this.plugin.settings.folder_location = value;
          await this.plugin.saveSettings();
        }));
  }
}
