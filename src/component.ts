import Vue, { PluginObject } from 'vue'
import elementUI from 'element-ui'
import rules from './rules'
import errorMessage from './error-message'
import { Component, Prop, Watch } from 'vue-property-decorator'

@Component
export default class ElFormItemVerifyComponent extends Vue {
  static fieldChange: 'verify' | 'clear'
  @Prop()
  canBeEmpty?: string
  @Prop([String, Function])
  verify?: string | Function
  @Prop()
  space?: string
  @Prop()
  errorMessage?: string
  @Prop()
  alias?: string
  @Prop()
  watch: undefined
  @Prop()
  fieldChange: string

  // watch某值并修改该值本身会额外触发一次，性能影响不大，暂不做过滤了。后期可能会用其它方式拦截
  @Watch('validateMessage')
  onValidateMessageChanged (msg: string) {
    if (this._verify && msg !== '') {
      const alias = this.alias || (this as any).label
      if (alias) (this as any).validateMessage = errorMessage.macroToValue((this as any).validateMessage, 'alias', alias)
    }
  }

  @Watch('watch')
  onWatchChanged () {
    if (this._verify) (this as any).validate('')
  }

  get _verify (): boolean {
    return this.verify !== undefined && (this as any).prop
  }

  getRules (): object[] {
    if (!this._verify) return (elementUI.FormItem as any).methods.getRules.apply(this, arguments)
    // 空检测
    let fieldValue = (this as any).fieldValue + ''
    if (this.space === undefined) fieldValue = fieldValue.trim()
    if (fieldValue === '') {
      return [{
        validator: (rule: any, val: any, callback: Function) => {
          if (this.canBeEmpty !== undefined || (this as any).minLength <= 0) callback()
          else callback(Error(errorMessage.get('empty')))
        }
      }]
    }
    // 合并普通规则
    let asyncVerifyRules: object[] = []
    const ruleGetters = rules()
    for (let name in ruleGetters) {
      const ruleVal = (this as any)[name]
      if (ruleVal !== undefined) asyncVerifyRules = asyncVerifyRules.concat(ruleGetters[name](ruleVal))
    }
    // 统一处理错误提示（代码块放在此处可以只针对普通规则）
    if (this.errorMessage !== undefined) {
      for (let rule of asyncVerifyRules) (rule as any).message = this.errorMessage
    }
    // 自定义校验方法置后
    if (typeof this.verify === 'function') asyncVerifyRules.push({ validator: this.verify })
    // 当规则为空时，返回一个始终通过的规则来避免空检测错误无法清除
    // 也可以通过(this as any).clearValidate()的方式实现，不过不太好
    return asyncVerifyRules.length === 0 ? [{
      validator (rule: any, val: any, callback: Function) {
        callback()
      }
    }] : asyncVerifyRules
  }

  onFieldChange () {
    const fieldChange = this.fieldChange || ElFormItemVerifyComponent.fieldChange
    if (!this._verify || fieldChange !== 'clear') (elementUI.FormItem as any).methods.onFieldChange.apply(this, arguments)
    else if (this._verify && fieldChange === 'clear') (this as any).clearValidate()
  }
}
