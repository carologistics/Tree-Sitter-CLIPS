(deftemplate floor
   (slot #)
   (slot people))

(deftemplate elevator
   (slot capacity)
   (slot occupants))

(deffacts initial
   (elevator (capacity 8) 
             (occupants 0))
   (floor (# ground) (people 0))
   (floor (# 1) (people 4))    
   (floor (# 2) (people 8))    
   (floor (# 3) (people 13)))  