import { Config } from '../config/config.service'

declare global {
    interface Window {
        config: Config
    }
}