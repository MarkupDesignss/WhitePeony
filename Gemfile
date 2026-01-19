source 'https://rubygems.org'

# Ruby version (Homebrew Ruby is fine)
ruby ">= 2.6.10"

# --- CocoaPods (match lockfile) ---
gem 'cocoapods', '= 1.16.2'

# --- ActiveSupport (RN safe range) ---
gem 'activesupport', '>= 6.1.7.5', '!= 7.1.0'

# --- REQUIRED for CocoaPods 1.16.2 ---
# CocoaPods 1.16.x depends on xcodeproj >= 1.27.0
gem 'xcodeproj', '>= 1.27.0', '< 2.0'

# --- Fix RN + Ruby compatibility ---
gem 'concurrent-ruby', '< 1.3.4'

# --- Ruby 3.4+ removed stdlibs ---
gem 'bigdecimal'
gem 'logger'
gem 'benchmark'
gem 'mutex_m'
