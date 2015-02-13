#!/bin/bash

### tests for Plugin Manager functionality and more ####
### Need to be run on clean repo (git clone) ####

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
BIN_DIR=$( cd "$DIR/../../bin" && pwd)
PLUGIN_COMMAND=$BIN_DIR/plugin
PLUGINS=(logstash-input-generator logstash-output-file)
LS_CONFIG=test.conf
LS_TEST_FILE=logstash-test.txt

(
cat <<EOF
input {
  generator {
    count => 41
  }
}
output {
  file { path => "$LS_TEST_FILE" }
}
EOF
) > $LS_CONFIG

cleanup () {
	if [ -f $LS_CONFIG ]; then
		rm $LS_CONFIG
	fi
	
	if [ -f $LS_TEST_FILE ]; then
		rm $LS_TEST_FILE
	fi
}

exit_if_fail () {
	if [[ $1 != 0 ]]; then
  		echo $2
  		cleanup
  		exit 1
	fi
}

exit_if_success () {
	if [[ $1 -eq 0 ]]; then
  		echo $2
  		cleanup
  		exit 1
	fi
}

is_plugin_installed () {
	lines=`$PLUGIN_COMMAND list| grep $1 | wc -l`
	test $lines -gt 0
}

rake bootstrap

########################

is_plugin_installed logstash-input-stdin
exit_if_success $? "Plugin logstash-input-stdin was already installed"

$PLUGIN_COMMAND install logstash-input-stdin
exit_if_fail $? "Plugin logstash-input-stdin was not installed"

is_plugin_installed logstash-input-stdin
exit_if_fail $? "Plugin logstash-input-stdin was not installed"

# uninstall the installed plugin
$PLUGIN_COMMAND uninstall logstash-input-stdin
exit_if_fail $? "Plugin logstash-input-stdin was not un-installed"

is_plugin_installed logstash-input-stdin
exit_if_success $? "Plugin logstash-input-stdin was not un-installed"

#########################
# install a bogus plugin

$PLUGIN_COMMAND install logstash-output-bogus
exit_if_success $? "Trying to install logstash-output-bogus"


########################
# Install test plugins

$PLUGIN_COMMAND install logstash-input-stdin
for plugin in "${PLUGINS[@]}"
do
  $PLUGIN_COMMAND install $plugin
  exit_if_fail $? $plugin
done

# load up logstash
cat $LS_CONFIG
$BIN_DIR/logstash -f $LS_CONFIG

sleep 10

lines=`cat $LS_TEST_FILE | wc -l`
test $lines -eq 41
exit_if_fail $? "Was expecting 41 lines, but got $lines"

cleanup
