(local tab (require :tab))

(fn configure []
  (let [tab-root (assert (os.getenv "TAB_ROOT")
                         "Set TAB_ROOT to TAB's engine directory.")]
    (tab.configure
     {:search-roots [{:attributes "attributes"}
                     {:attributes (.. tab-root "/packages/mudlib/attributes")
                      :behaviors (.. tab-root "/packages/mudlib/behaviors")
                      :commands (.. tab-root "/packages/mudlib/commands")}
                     {:attributes (.. tab-root "/attributes")
                      :behaviors (.. tab-root "/behaviors")
                      :commands (.. tab-root "/commands")}]
      :writable-attributes-root "attributes"})))

{:configure configure}
